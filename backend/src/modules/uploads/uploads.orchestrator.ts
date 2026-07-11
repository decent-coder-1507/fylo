import prisma from "../../lib/db/prisma";
import { TelegramUploadProvider } from "./providers/telegram.provider";
import { UploadPayload, UploadResult, IUploadStorageProvider } from "./uploads.types";
import { validateUploadPayload } from "./uploads.validation";
import { resolveTelegramTarget, cleanupTempFile } from "./uploads.utils";
import { globalUploadPlanner } from "./uploads.planner";
import { globalUploadSessionService } from "./uploads.session";
import { createPreviewJob } from "../previews/previews.service";

/**
 * UploadOrchestrator manages the end-to-end orchestration logic for file uploads.
 * It validates requests, resolves targets, uploads content, writes database records,
 * triggers previews, and ensures local temp cleanup.
 */
export class UploadOrchestrator {
    private readonly storageProvider: IUploadStorageProvider;

    constructor(storageProvider: IUploadStorageProvider = new TelegramUploadProvider()) {
        this.storageProvider = storageProvider;
    }

    /**
     * Executes the orchestrated upload pipeline.
     */
    public async orchestrate(payload: UploadPayload): Promise<UploadResult> {
        // 1. Validation
        await validateUploadPayload(payload);

        const { filePath, originalName, mimeType, size, folderId, sessionId } = payload;

        // 2. Initialize or retrieve Upload Session
        let session = sessionId ? await globalUploadSessionService.getSession(sessionId) : null;
        if (!session) {
            session = await globalUploadSessionService.createSession(originalName, size, mimeType, folderId);
        }

        try {
            // Update session status to UPLOADING
            await globalUploadSessionService.updateSessionStatus(session.id, "UPLOADING");

            // 3. Generate Upload Plan (calculates checksum from the temp file on disk)
            const plan = await globalUploadPlanner.createPlan(filePath, originalName, size, mimeType);
            console.log(`[UploadOrchestrator] Generated upload plan for session ${plan.sessionId}:`, JSON.stringify(plan, null, 2));

            // Sync calculated plan and checksum to the session
            await globalUploadSessionService.updateSessionStatus(session.id, "UPLOADING", {
                checksum: plan.metadata.checksum,
                plan: plan,
            });

            // 4. Resolve Telegram Target
            const { target, dbFolderId } = await resolveTelegramTarget(folderId);

            // 5. Duplicate Detection Check
            console.log(`[UploadOrchestrator] Checking for duplicates with checksum: ${plan.metadata.checksum}`);
            const existingFile = await prisma.file.findFirst({
                where: {
                    checksum: plan.metadata.checksum,
                },
                include: {
                    preview: true,
                },
            });

            if (existingFile) {
                console.log(`[UploadOrchestrator] Duplicate content detected. Reusing existing file telegram message (${existingFile.telegramMessageId}) and skipping upload.`);

                // Create a new database entry reusing the Telegram storage details but keeping the new filename/metadata
                const savedFile = await prisma.file.create({
                    data: {
                        name: plan.metadata.name || "unnamed",
                        mimeType: plan.metadata.mimeType || null,
                        telegramMessageId: existingFile.telegramMessageId,
                        size: plan.metadata.size,
                        checksum: plan.metadata.checksum,
                        folderId: dbFolderId,
                        isChunked: existingFile.isChunked,
                        totalChunks: existingFile.totalChunks,
                    },
                });

                console.log(`[UploadOrchestrator] Saved duplicate file in database with ID: ${savedFile.id}`);

                // Update session status to COMPLETED and associate fileId
                await globalUploadSessionService.updateSessionStatus(session.id, "COMPLETED", {
                    fileId: savedFile.id,
                });

                // Clone preview metadata if available to bypass regenerating the preview
                if (existingFile.preview) {
                    try {
                        await prisma.filePreview.create({
                            data: {
                                fileId: savedFile.id,
                                status: existingFile.preview.status,
                                thumbnailUrl: existingFile.preview.thumbnailUrl,
                                thumbnailSize: existingFile.preview.thumbnailSize,
                                thumbnailMimeType: existingFile.preview.thumbnailMimeType,
                                previewUrl: existingFile.preview.previewUrl,
                                previewMimeType: existingFile.preview.previewMimeType,
                                previewSize: existingFile.preview.previewSize,
                                metadata: existingFile.preview.metadata || undefined,
                                error: existingFile.preview.error,
                            },
                        });
                        console.log(`[UploadOrchestrator] Cloned existing file preview metadata for file: ${savedFile.id}`);
                    } catch (previewCloneErr) {
                        console.error(`⚠️ [UploadOrchestrator] Failed to clone preview for file ${savedFile.id}:`, previewCloneErr);
                    }
                } else {
                    // Trigger new preview job if existing file did not have preview generated yet
                    try {
                        await createPreviewJob(savedFile.id);
                        console.log(`[UploadOrchestrator] Scheduled preview generation job for duplicate file: ${savedFile.id}`);
                    } catch (previewErr) {
                        console.error(`⚠️ [UploadOrchestrator] Failed to schedule preview job for duplicate file ${savedFile.id}:`, previewErr);
                    }
                }

                return { file: savedFile };
            }

            // 6. Storage Upload using Metadata from Plan
            console.log(`[UploadOrchestrator] Uploading file '${plan.metadata.name}' using provider '${this.storageProvider.name}'...`);
            const uploadResult = await this.storageProvider.upload(target, filePath, {
                originalName: plan.metadata.name,
                mimeType: plan.metadata.mimeType,
            });

            // 7. Save metadata in database
            console.log(`[UploadOrchestrator] Saving file metadata to database...`);
            const savedFile = await prisma.file.create({
                data: {
                    name: plan.metadata.name || "unnamed",
                    mimeType: plan.metadata.mimeType || null,
                    telegramMessageId: uploadResult.telegramMessageId,
                    size: plan.metadata.size,
                    checksum: plan.metadata.checksum,
                    folderId: dbFolderId,
                    isChunked: plan.isChunked,
                    totalChunks: plan.totalChunks,
                },
            });

            console.log(`[UploadOrchestrator] Saved file in database with ID: ${savedFile.id}`);

            // Update session status to COMPLETED and associate fileId
            await globalUploadSessionService.updateSessionStatus(session.id, "COMPLETED", {
                fileId: savedFile.id,
            });

            // 8. Create and schedule preview generation job
            try {
                await createPreviewJob(savedFile.id);
                console.log(`[UploadOrchestrator] Scheduled preview generation job for file: ${savedFile.id}`);
            } catch (previewErr) {
                console.error(`⚠️ [UploadOrchestrator] Failed to schedule preview job for file ${savedFile.id}:`, previewErr);
            }

            return { file: savedFile };
        } catch (error) {
            // Set session status to FAILED on any processing error
            if (session) {
                try {
                    await globalUploadSessionService.updateSessionStatus(session.id, "FAILED");
                } catch (sessionErr) {
                    console.error("⚠️ Failed to mark session status as FAILED:", sessionErr);
                }
            }
            throw error;
        } finally {
            // 9. Cleanup local temp file and directory after upload attempts
            await cleanupTempFile(filePath);
        }
    }
}

// Export a default global instance of the orchestrator
export const globalUploadOrchestrator = new UploadOrchestrator();

