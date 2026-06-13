import fs from "fs";
import path from "path";
import prisma from "../../lib/db/prisma";
import { client as tgClient } from "../../lib/telegram/client";
import { Api } from "telegram";
import bigInt from "big-integer";
import { PreviewStatus } from "@prisma/client";
import { globalProcessorRegistry, ProcessorRegistry } from "./processors/registry";
import {
    createPreview,
    markSuccess,
    markFailed,
    incrementRetries
} from "./previews.repository";
import { globalStorageProvider } from "../storage/storage.factory";

/**
 * Orchestrator responsible for managing the file preview generation lifecycle.
 * Coordinates file downloads, matching processors, storing outputs, and error handling.
 */
export class PreviewManager {
    private readonly registry: ProcessorRegistry;
    private readonly previewsDir: string;
    
    // Production limits
    private readonly maxFileSize: number = 500 * 1024 * 1024; // 500 MB limit
    private readonly stallTimeoutMs: number = 15 * 60 * 1000; // 15 minutes stall timeout

    constructor(registry: ProcessorRegistry = globalProcessorRegistry) {
        this.registry = registry;
        this.previewsDir = path.join(process.cwd(), "uploads", "previews");
        
        // Ensure previews storage directory exists
        if (!fs.existsSync(this.previewsDir)) {
            fs.mkdirSync(this.previewsDir, { recursive: true });
        }
    }

    /**
     * Processes preview generation for a given file ID.
     * Implements concurrency checks, retry policies, and cleanup.
     * 
     * @param fileId - Database ID of the File to process
     */
    public async processFilePreview(fileId: string): Promise<void> {
        // 1. Fetch file record from database with existing preview if any
        const fileRecord = await prisma.file.findUnique({
            where: { id: fileId },
            include: { folder: true, preview: true }
        });

        if (!fileRecord) {
            console.error(`[PreviewManager] File not found in database: ${fileId}`);
            return;
        }

        const mimeType = fileRecord.mimeType || "application/octet-stream";
        const fileName = fileRecord.name;
        const fileSize = fileRecord.size || 0;

        // 2. Validate file size constraints to protect disk and memory
        if (fileSize > this.maxFileSize) {
            console.log(`[PreviewManager] File size (${fileSize} bytes) exceeds limit (${this.maxFileSize} bytes). Skipping.`);
            await this.ensurePreviewRecord(fileId, PreviewStatus.SKIPPED, {
                reason: "File exceeds maximum size limit for preview generation."
            });
            return;
        }

        // 3. Select appropriate processor
        const processor = this.registry.getProcessor(mimeType, fileName);
        if (!processor) {
            console.log(`[PreviewManager] No processor found for file: ${fileName} (${mimeType}). Marking as SKIPPED.`);
            await this.ensurePreviewRecord(fileId, PreviewStatus.SKIPPED, {
                reason: "No matching preview processor found for this file type."
            });
            return;
        }

        // 4. Retrieve or create the FilePreview record
        let previewRecord = fileRecord.preview;
        if (!previewRecord) {
            previewRecord = await createPreview({
                fileId,
                status: PreviewStatus.PENDING
            });
        }

        // 5. Concurrency & state validation
        if (previewRecord.status === PreviewStatus.COMPLETED) {
            console.log(`[PreviewManager] Preview for file ${fileId} already completed. Skipping.`);
            return;
        }

        if (previewRecord.status === PreviewStatus.SKIPPED) {
            console.log(`[PreviewManager] Preview for file ${fileId} is marked as SKIPPED. Skipping.`);
            return;
        }

        if (previewRecord.attempts >= previewRecord.maxAttempts) {
            console.log(`[PreviewManager] Max retry attempts (${previewRecord.maxAttempts}) reached for file ${fileId}.`);
            if (previewRecord.status !== PreviewStatus.FAILED) {
                await markFailed(fileId, "Maximum retry attempts exceeded.");
            }
            return;
        }

        // Check if another worker is active on this record
        if (previewRecord.status === PreviewStatus.PROCESSING) {
            const startedAt = previewRecord.startedAt;
            const isStalled = startedAt && (Date.now() - startedAt.getTime() > this.stallTimeoutMs);
            if (!isStalled) {
                console.log(`[PreviewManager] Preview for file ${fileId} is currently being processed by another worker. Skipping.`);
                return;
            }
            console.log(`[PreviewManager] Preview for file ${fileId} is stalled in PROCESSING. Picking it up.`);
        }

        // 6. Atomic state transition check to claim the task
        const claimResult = await prisma.filePreview.updateMany({
            where: {
                fileId,
                OR: [
                    { status: PreviewStatus.PENDING },
                    { status: PreviewStatus.FAILED },
                    { 
                        status: PreviewStatus.PROCESSING,
                        startedAt: { lt: new Date(Date.now() - this.stallTimeoutMs) }
                    }
                ]
            },
            data: {
                status: PreviewStatus.PROCESSING,
                startedAt: new Date(),
                error: null
            }
        });

        if (claimResult.count === 0) {
            console.log(`[PreviewManager] Failed to claim task for file ${fileId}. Likely claimed by another worker.`);
            return;
        }

        let tempFilePath = "";
        try {
            // 7. Download file from Telegram to temporary local file
            console.log(`[PreviewManager] Downloading file ${fileName} from Telegram...`);
            tempFilePath = await this.downloadTelegramFile(fileRecord);
            console.log(`[PreviewManager] File downloaded to: ${tempFilePath}`);

            // 8. Execute processor
            const context = {
                fileId,
                fileName,
                mimeType,
                size: fileSize,
                localPath: tempFilePath
            };

            console.log(`[PreviewManager] Processing file with "${processor.name}"...`);
            const result = await processor.process(context);

            // Delete old preview files if they existed to prevent orphaned files in storage
            if (previewRecord) {
                if (previewRecord.thumbnailUrl) {
                    try {
                        await globalStorageProvider.delete(previewRecord.thumbnailUrl);
                    } catch (delErr) {
                        console.error(`[PreviewManager] Failed to delete old thumbnail: ${previewRecord.thumbnailUrl}`, delErr);
                    }
                }
                if (previewRecord.previewUrl) {
                    try {
                        await globalStorageProvider.delete(previewRecord.previewUrl);
                    } catch (delErr) {
                        console.error(`[PreviewManager] Failed to delete old preview: ${previewRecord.previewUrl}`, delErr);
                    }
                }
            }

            // 9. Save generated assets (Thumbnail & Preview) to configured storage provider
            const savedAssets: {
                thumbnailUrl?: string;
                thumbnailSize?: number;
                thumbnailMimeType?: string;
                previewUrl?: string;
                previewSize?: number;
                previewMimeType?: string;
            } = {};

            const timestamp = Date.now();

            if (result.thumbnail) {
                const thumbExt = result.thumbnail.mimeType.split("/")[1] || "jpg";
                const thumbFileName = `thumb_${fileId}_${timestamp}.${thumbExt}`;
                
                console.log(`[PreviewManager] Uploading thumbnail to storage...`);
                const uploadUrl = await globalStorageProvider.upload(result.thumbnail.buffer, {
                    fileName: thumbFileName,
                    mimeType: result.thumbnail.mimeType,
                    folder: "thumbnails"
                });
                
                savedAssets.thumbnailUrl = uploadUrl;
                savedAssets.thumbnailSize = result.thumbnail.buffer.length;
                savedAssets.thumbnailMimeType = result.thumbnail.mimeType;
            }

            if (result.preview) {
                const prevExt = result.preview.mimeType.split("/")[1] || "bin";
                const prevFileName = `prev_${fileId}_${timestamp}.${prevExt}`;
                
                console.log(`[PreviewManager] Uploading preview to storage...`);
                const uploadUrl = await globalStorageProvider.upload(result.preview.buffer, {
                    fileName: prevFileName,
                    mimeType: result.preview.mimeType,
                    folder: "previews"
                });
                
                savedAssets.previewUrl = uploadUrl;
                savedAssets.previewSize = result.preview.buffer.length;
                savedAssets.previewMimeType = result.preview.mimeType;
            }

            // 10. Update database status to COMPLETED
            await markSuccess(fileId, {
                ...savedAssets,
                metadata: result.metadata,
            });
            console.log(`[PreviewManager] Preview successfully completed for file: ${fileName}`);

        } catch (error: any) {
            console.error(`[PreviewManager] Processing error for file ${fileName}:`, error);

            const errorMessage = error?.message || String(error);
            const updated = await incrementRetries(fileId, errorMessage);

            // Check if attempts hit limit to transition to FAILED permanently
            if (updated.attempts >= updated.maxAttempts) {
                await markFailed(fileId, `Failed after max attempts. Last error: ${errorMessage}`);
                console.log(`[PreviewManager] File ${fileId} marked as FAILED permanently.`);
            } else {
                // Return status to PENDING so the background worker can try again
                await prisma.filePreview.update({
                    where: { fileId },
                    data: { status: PreviewStatus.PENDING }
                });
            }
        } finally {
            // 11. Clean up temporary downloaded original file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    await fs.promises.unlink(tempFilePath);
                    const parentDir = path.dirname(tempFilePath);
                    // Remove temp subdirectories if generated
                    if (parentDir.includes("uploads") && parentDir !== path.join(process.cwd(), "uploads")) {
                        await fs.promises.rmdir(parentDir);
                    }
                } catch (cleanupErr) {
                    console.error(`[PreviewManager] Failed to clean up temp file: ${tempFilePath}`, cleanupErr);
                }
            }
        }
    }

    /**
     * Helper to guarantee a FilePreview record exists with a specific status and metadata.
     */
    private async ensurePreviewRecord(
        fileId: string,
        status: PreviewStatus,
        metadata?: any
    ): Promise<void> {
        const existing = await prisma.filePreview.findUnique({
            where: { fileId }
        });

        if (existing) {
            await prisma.filePreview.update({
                where: { fileId },
                data: {
                    status,
                    ...(metadata && { metadata })
                }
            });
        } else {
            await createPreview({
                fileId,
                status,
                ...(metadata && { metadata })
            });
        }
    }

    /**
     * Downloads file content from Telegram and writes it to a temporary file.
     * 
     * @param fileRecord - The file database record
     * @returns Promise<string> - Path to the local temporary file
     */
    private async downloadTelegramFile(fileRecord: any): Promise<string> {
        let target: any = "me";
        if (fileRecord.folder) {
            const folder = fileRecord.folder;
            if (folder.accessHash) {
                target = new Api.InputPeerChannel({
                    channelId: bigInt(folder.telegramId.toString()),
                    accessHash: bigInt(folder.accessHash),
                });
            } else {
                target = bigInt(folder.telegramId.toString());
            }
        }

        const messages = await tgClient.getMessages(target, {
            ids: [fileRecord.telegramMessageId],
        });

        const message = messages[0];
        if (!message || !message.media) {
            throw new Error("File media not found in Telegram chat");
        }

        // Generate isolated subdirectory under uploads to avoid collision
        const tempSubdir = path.join(process.cwd(), "uploads", `temp_${fileRecord.id}_${Date.now()}`);
        if (!fs.existsSync(tempSubdir)) {
            fs.mkdirSync(tempSubdir, { recursive: true });
        }
        
        const tempFilePath = path.join(tempSubdir, fileRecord.name);

        console.log(`[PreviewManager] Downloading media message for message ID ${fileRecord.telegramMessageId}`);
        const buffer = await tgClient.downloadMedia(message);
        if (!buffer) {
            throw new Error("Failed to download media buffer from Telegram");
        }

        if (typeof buffer === "string") {
            await fs.promises.copyFile(buffer, tempFilePath);
            await fs.promises.unlink(buffer);
        } else {
            await fs.promises.writeFile(tempFilePath, buffer);
        }

        return tempFilePath;
    }
}

// Global manager instance
export const globalPreviewManager = new PreviewManager();
