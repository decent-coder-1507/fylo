import { Request, Response } from "express";
import { globalUploadOrchestrator } from "./uploads.orchestrator";
import { globalUploadSessionService } from "./uploads.session";
import prisma from "../../lib/db/prisma";
import { resolveTelegramTarget, cleanupTempFile } from "./uploads.utils";
import { createPreviewJob } from "../previews/previews.service";
import { globalRetryEngine } from "./retry.engine";
import { TelegramUploadProvider } from "./providers/telegram.provider";
import { globalChecksumService } from "./checksum.service";
import { scheduleAiProcessing } from "../ai-processing/ai-processing.service";

/**
 * Controller endpoint for handling direct file uploads.
 * Optionally integrates with an existing session ID if supplied.
 */
export const uploadFileController = async (req: Request, res: Response) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { folderId, sessionId } = req.body;
        let artifactMetadata: any = undefined;
        if (req.body.artifactMetadata) {
            try {
                artifactMetadata = typeof req.body.artifactMetadata === "string"
                    ? JSON.parse(req.body.artifactMetadata)
                    : req.body.artifactMetadata;
            } catch (err) {
                console.warn("Failed to parse artifactMetadata in uploadFileController:", err);
            }
        }

        const result = await globalUploadOrchestrator.orchestrate({
            filePath: file.path,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            folderId,
            sessionId,
            artifactMetadata,
        });

        res.json({
            ...result.file,
            deduplicated: result.deduplicated || false,
        });
    } catch (error: any) {
        console.error("❌ Upload Error:", error);
        res.status(500).json({ error: error?.message || "Failed to upload file" });
    }
};

/**
 * Controller endpoint for initializing a new upload session workflow.
 */
export const createUploadSessionController = async (req: Request, res: Response) => {
    try {
        const { fileName, size, mimeType, folderId, checksum, artifactMetadata } = req.body;

        if (!fileName || size === undefined) {
            return res.status(400).json({ error: "fileName and size are required fields" });
        }

        const session = await globalUploadSessionService.createSession(
            fileName,
            Number(size),
            mimeType,
            folderId,
            checksum,
            artifactMetadata
        );

        res.status(201).json(session);
    } catch (error: any) {
        console.error("❌ Create Upload Session Error:", error);
        res.status(500).json({ error: error?.message || "Failed to create upload session" });
    }
};

/**
 * Controller endpoint for retrieving details and progress of a specific upload session.
 */
export const getUploadSessionController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const session = await globalUploadSessionService.getSession(id as string);

        if (!session) {
            return res.status(404).json({ error: "Upload session not found" });
        }

        res.json(session);
    } catch (error: any) {
        console.error("❌ Get Upload Session Error:", error);
        res.status(500).json({ error: error?.message || "Failed to retrieve upload session" });
    }
};

/**
 * Controller endpoint for listing recent upload session workflows.
 */
export const listUploadSessionsController = async (req: Request, res: Response) => {
    try {
        const sessions = await globalUploadSessionService.listSessions();
        res.json(sessions);
    } catch (error: any) {
        console.error("❌ List Upload Sessions Error:", error);
        res.status(500).json({ error: error?.message || "Failed to list upload sessions" });
    }
};

/**
 * Controller endpoint for uploading a specific chunk of a chunked upload session.
 */
export const uploadSessionChunkController = async (req: Request, res: Response) => {
    const { id, index } = req.params;
    const chunkFile = req.file;

    if (!chunkFile) {
        return res.status(400).json({ error: "No chunk file uploaded" });
    }

    const chunkIndex = parseInt(index as string, 10);
    const expectedChecksum = req.headers["x-chunk-checksum"] as string;

    try {
        // Retrieve the session
        const session = await globalUploadSessionService.getSession(id as string);
        if (!session) {
            return res.status(404).json({ error: "Upload session not found" });
        }

        if (!session.plan || !session.plan.chunks) {
            return res.status(400).json({ error: "Session does not contain a valid chunk plan" });
        }

        if (chunkIndex < 0 || chunkIndex >= session.plan.chunks.length) {
            return res.status(400).json({ error: `Invalid chunk index: ${chunkIndex}. Expected 0 to ${session.plan.chunks.length - 1}` });
        }

        // 1. Calculate chunk SHA-256 and validate integrity
        const calculatedChecksum = await globalChecksumService.generateSha256(chunkFile.path);
        
        if (expectedChecksum && calculatedChecksum !== expectedChecksum) {
            await cleanupTempFile(chunkFile.path);
            return res.status(400).json({ 
                error: `Chunk integrity verification failed. Expected: ${expectedChecksum}, Calculated: ${calculatedChecksum}` 
            });
        }

        // 2. Resolve Telegram destination peer
        const { target } = await resolveTelegramTarget(session.folderId);

        // 3. Upload chunk to Telegram via storage provider and retry engine
        const storageProvider = new TelegramUploadProvider();
        console.log(`[ChunkUpload] Uploading chunk ${chunkIndex + 1}/${session.plan.chunks.length} for session ${session.id} to Telegram...`);
        const uploadResult = await globalRetryEngine.executeWithRetry(session.id, async () => {
            return await storageProvider.upload(target, chunkFile.path, {
                originalName: `${session.fileName}.part${chunkIndex}`,
                mimeType: "application/octet-stream",
            });
        });

        // 4. Update the chunk in the plan
        const updatedChunks = [...session.plan.chunks];
        updatedChunks[chunkIndex] = {
            ...updatedChunks[chunkIndex],
            status: "completed",
            telegramMessageId: uploadResult.telegramMessageId,
            checksum: calculatedChecksum,
        };

        const updatedPlan = {
            ...session.plan,
            chunks: updatedChunks,
            chunkPlanning: {
                ...session.plan.chunkPlanning,
                chunks: updatedChunks,
            }
        };

        // Persist updated plan in the database
        await globalUploadSessionService.updateSessionStatus(session.id, "UPLOADING", {
            plan: updatedPlan,
        });

        res.json({
            success: true,
            chunkIndex,
            checksum: calculatedChecksum,
            telegramMessageId: uploadResult.telegramMessageId,
        });
    } catch (error: any) {
        console.error(`❌ Chunk Upload Error (Index ${chunkIndex}):`, error);
        res.status(500).json({ error: error?.message || "Failed to upload chunk" });
    } finally {
        // Cleanup local temp chunk file
        await cleanupTempFile(chunkFile.path);
    }
};

/**
 * Controller endpoint to verify chunked upload completion, stitch records, and close the session.
 */
export const verifyUploadSessionController = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const session = await globalUploadSessionService.getSession(id as string);
        if (!session) {
            return res.status(404).json({ error: "Upload session not found" });
        }

        if (!session.plan || !session.plan.chunks) {
            return res.status(400).json({ error: "Upload session is missing a plan" });
        }

        // 1. Verify that all chunks have been completed
        const pendingChunks = session.plan.chunks.filter((c: any) => c.status !== "completed");
        if (pendingChunks.length > 0) {
            return res.status(400).json({
                error: `Upload session is not complete. Remaining chunks: ${pendingChunks.map((c: any) => c.index).join(", ")}`
            });
        }

        const { dbFolderId } = await resolveTelegramTarget(session.folderId);

        // 2. Persist the final unified File record
        // Reference the first chunk's telegramMessageId as the primary placeholder
        const primaryMessageId = session.plan.chunks[0].telegramMessageId || 0;
        
        const savedFile = await prisma.file.create({
            data: {
                name: session.fileName,
                mimeType: session.mimeType || null,
                telegramMessageId: primaryMessageId,
                size: session.size,
                checksum: session.checksum || null,
                folderId: dbFolderId || null,
                isChunked: true,
                totalChunks: session.totalChunks,
                projectName: session.projectName || null,
                projectVersion: session.projectVersion || null,
                commitHash: session.commitHash || null,
                branchName: session.branchName || null,
                buildEnv: session.buildEnv || null,
                tags: session.tags || [],
                uploaderName: session.uploaderName || null,
                uploaderEmail: session.uploaderEmail || null,
            },
        });

        // 3. Persist the FileChunk records for segment tracking
        for (const chunk of session.plan.chunks) {
            await prisma.fileChunk.create({
                data: {
                    fileId: savedFile.id,
                    chunkIndex: chunk.index,
                    telegramMessageId: chunk.telegramMessageId || 0,
                    size: chunk.size,
                },
            });
        }

        // 4. Update the session status to COMPLETED
        await globalUploadSessionService.updateSessionStatus(session.id, "COMPLETED", {
            fileId: savedFile.id,
        });

        // 5. Schedule preview generation
        try {
            await createPreviewJob(savedFile.id);
            console.log(`[VerifySession] Scheduled preview generation job for file: ${savedFile.id}`);
        } catch (previewErr) {
            console.error(`⚠️ [VerifySession] Failed to schedule preview job:`, previewErr);
        }

        scheduleAiProcessing(savedFile.id);

        res.json({
            ...savedFile,
            deduplicated: false,
        });
    } catch (error: any) {
        console.error("❌ Verify Session Error:", error);
        res.status(500).json({ error: error?.message || "Failed to verify upload session" });
    }
};
