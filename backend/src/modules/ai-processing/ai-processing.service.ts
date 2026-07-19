import { AiProcessingStatus } from "@prisma/client";
import prisma from "../../lib/db/prisma";
import { extractFileContent } from "./content-extraction.service";
import { globalAiProcessingQueueClient } from "./ai-processing.queue";
import {
    globalAiService,
    knowledgeProcessingSchema,
    KNOWLEDGE_PROCESSING_SYSTEM_INSTRUCTION,
    buildKnowledgeProcessingPrompt,
    KnowledgeProcessingOutput,
    aiConfig,
    globalVectorStore,
} from "../ai";

const PROCESSING_LEASE_MS = 15 * 60 * 1000;

/**
 * Records and publishes work after a file is committed. Queue availability is deliberately
 * isolated from the upload response; unqueued PENDING records are recovered by the worker.
 */
export async function enqueueAiProcessing(fileId: string): Promise<void> {
    const job = await prisma.fileAiProcessing.upsert({
        where: { fileId },
        create: { fileId, status: AiProcessingStatus.PENDING },
        update: {},
    });

    if (job.status !== AiProcessingStatus.PENDING) return;

    const published = await globalAiProcessingQueueClient.publish(fileId);
    if (!published) {
        console.warn(`[AiProcessing] Queue is saturated for file ${fileId}; its durable PENDING job will be recovered.`);
    }
}

/** Safely detaches scheduling from the request lifecycle after a file is committed. */
export function scheduleAiProcessing(fileId: string): void {
    void enqueueAiProcessing(fileId).catch((error) => {
        console.error(`[AiProcessing] Failed to schedule processing for file ${fileId}:`, error);
    });
}

/**
 * Runs only in the worker. An updateMany claim makes duplicate messages harmless and permits
 * another worker to recover a job whose lease expired after a crash.
 */
export async function processAiProcessingJob(fileId: string): Promise<void> {
    if (!aiConfig.geminiApiKey) {
        await prisma.fileAiProcessing.updateMany({
            where: { fileId, status: AiProcessingStatus.PENDING },
            data: {
                status: AiProcessingStatus.SKIPPED,
                error: "GEMINI_API_KEY is not configured",
                completedAt: new Date(),
            },
        });
        return;
    }

    const now = new Date();
    const leaseExpiredAt = new Date(now.getTime() - PROCESSING_LEASE_MS);
    const claim = await prisma.fileAiProcessing.updateMany({
        where: {
            fileId,
            attempts: { lt: 3 },
            OR: [
                { status: AiProcessingStatus.PENDING },
                { status: AiProcessingStatus.PROCESSING, startedAt: { lt: leaseExpiredAt } },
            ],
        },
        data: {
            status: AiProcessingStatus.PROCESSING,
            startedAt: now,
            error: null,
            attempts: { increment: 1 },
        },
    });

    if (claim.count === 0) return;

    const file = await prisma.file.findUnique({
        where: { id: fileId },
        select: {
            id: true,
            name: true,
            mimeType: true,
            size: true,
            checksum: true,
            projectName: true,
            projectVersion: true,
            tags: true,
            folderId: true,
        },
    });

    if (!file) {
        await prisma.fileAiProcessing.update({
            where: { fileId },
            data: { status: AiProcessingStatus.SKIPPED, error: "File was deleted before AI processing began", completedAt: new Date() },
        });
        return;
    }

    try {
        const extraction = await extractFileContent(file.id, file.mimeType, file.name);
        if (!extraction.supported) {
            await prisma.fileAiProcessing.update({
                where: { fileId },
                data: {
                    status: AiProcessingStatus.SKIPPED,
                    extractionMetadata: { reason: extraction.reason },
                    error: null,
                    completedAt: new Date(),
                },
            });
            return;
        }

        await prisma.fileAiProcessing.update({
            where: { fileId },
            data: {
                extractedText: extraction.extraction.text,
                extractionMetadata: {
                    ...extraction.extraction.metadata,
                    truncated: extraction.extraction.truncated,
                },
            },
        });

        // Use standard structured output generation via the globalAiService
        const prompt = buildKnowledgeProcessingPrompt(
            file.name,
            file.mimeType || "unknown",
            extraction.extraction.text
        );

        const response = await globalAiService.generateStructured<KnowledgeProcessingOutput>(
            "flash",
            {
                prompt,
                responseSchema: knowledgeProcessingSchema,
                systemInstruction: KNOWLEDGE_PROCESSING_SYSTEM_INSTRUCTION,
            }
        );

        await prisma.fileAiProcessing.update({
            where: { fileId },
            data: {
                status: AiProcessingStatus.COMPLETED,
                summary: response.data.summary || null,
                suggestedTags: Array.isArray(response.data.tags) ? response.data.tags : [],
                result: response.data as any,
                completedAt: new Date(),
                error: null,
            },
        });

        // Generate semantic embeddings and store in vector database (Qdrant)
        // Wrapping this in try-catch so failures do not fail uploads or AI analysis
        try {
            console.log(`📡 [AiProcessing] Generating semantic embeddings for file: ${file.name} (${file.id})...`);
            const textToEmbed = extraction.extraction.text || file.name;
            const embeddingResponse = await globalAiService.embed({ text: textToEmbed });
            
            console.log(`📡 [AiProcessing] Upserting vector to Qdrant collection for file: ${file.id}...`);
            await globalVectorStore.upsert(file.id, embeddingResponse.values, {
                fileId: file.id,
                fileName: file.name,
                mimeType: file.mimeType || "unknown",
                folderId: file.folderId,
            });
            console.log(`✅ [AiProcessing] Semantic embeddings processed successfully for file: ${file.id}.`);
        } catch (embedError: any) {
            console.error(`⚠️ [AiProcessing] Embedding generation or vector storage failed for file ${file.id}:`, embedError);
            // Observe the error but do not throw or halt execution, preserving file and text analysis
        }
    } catch (error: any) {
        const message = error?.message || String(error);
        const job = await prisma.fileAiProcessing.findUniqueOrThrow({
            where: { fileId },
            select: { attempts: true, maxAttempts: true },
        });

        await prisma.fileAiProcessing.update({
            where: { fileId },
            data: {
                status: job.attempts >= job.maxAttempts ? AiProcessingStatus.FAILED : AiProcessingStatus.PENDING,
                error: message,
            },
        });
        throw error;
    }
}

/** Restores work lost while RabbitMQ or a worker was unavailable. */
export async function reschedulePendingAiProcessing(): Promise<number> {
    const leaseExpiredAt = new Date(Date.now() - PROCESSING_LEASE_MS);
    await prisma.fileAiProcessing.updateMany({
        where: { status: AiProcessingStatus.PROCESSING, startedAt: { lt: leaseExpiredAt } },
        data: { status: AiProcessingStatus.PENDING },
    });

    const jobs = await prisma.fileAiProcessing.findMany({
        where: { status: AiProcessingStatus.PENDING, attempts: { lt: 3 } },
        select: { fileId: true },
    });

    for (const job of jobs) await enqueueAiProcessing(job.fileId);
    return jobs.length;
}
