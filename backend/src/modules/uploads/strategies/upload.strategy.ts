import { UploadSession, UploadPlan, UploadPayload, UploadResult, IUploadStorageProvider } from "../uploads.types";
import prisma from "../../../lib/db/prisma";
import { resolveTelegramTarget } from "../uploads.utils";
import { createPreviewJob } from "../../previews/previews.service";
import { globalUploadSessionService } from "../uploads.session";
import { globalRetryEngine } from "../retry.engine";

export interface IUploadStrategy {
    execute(
        session: UploadSession,
        plan: UploadPlan,
        payload: UploadPayload,
        storageProvider: IUploadStorageProvider
    ): Promise<UploadResult>;
}

export class DuplicateReuseStrategy implements IUploadStrategy {
    public async execute(
        session: UploadSession,
        plan: UploadPlan,
        payload: UploadPayload,
        storageProvider: IUploadStorageProvider
    ): Promise<UploadResult> {
        const { folderId } = payload;
        const { dbFolderId } = await resolveTelegramTarget(folderId);

        console.log(`[DuplicateReuseStrategy] Duplicate detected. Reusing existing telegram message reference.`);
        const existingFile = await prisma.file.findFirst({
            where: { checksum: plan.metadata.checksum },
            include: { preview: true }
        });

        if (!existingFile) {
            throw new Error(`Deduplication target not found for checksum: ${plan.metadata.checksum}`);
        }

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

        // Update session status to COMPLETED, indicating deduplication
        await globalUploadSessionService.updateSessionStatus(session.id, "COMPLETED", {
            fileId: savedFile.id,
            deduplicated: true,
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
                console.log(`[DuplicateReuseStrategy] Cloned existing file preview metadata for file: ${savedFile.id}`);
            } catch (previewCloneErr) {
                console.error(`⚠️ [DuplicateReuseStrategy] Failed to clone preview for file ${savedFile.id}:`, previewCloneErr);
            }
        } else {
            // Trigger new preview job if existing file did not have preview generated yet
            try {
                await createPreviewJob(savedFile.id);
                console.log(`[DuplicateReuseStrategy] Scheduled preview generation job for duplicate file: ${savedFile.id}`);
            } catch (previewErr) {
                console.error(`⚠️ [DuplicateReuseStrategy] Failed to schedule preview job for duplicate file ${savedFile.id}:`, previewErr);
            }
        }

        return { file: savedFile, deduplicated: true };
    }
}

export class StandardUploadStrategy implements IUploadStrategy {
    public async execute(
        session: UploadSession,
        plan: UploadPlan,
        payload: UploadPayload,
        storageProvider: IUploadStorageProvider
    ): Promise<UploadResult> {
        const { filePath, folderId } = payload;
        const { target, dbFolderId } = await resolveTelegramTarget(folderId);

        console.log(`[StandardUploadStrategy] Direct upload starting for: ${plan.metadata.name}`);
        const uploadResult = await globalRetryEngine.executeWithRetry(session.id, async () => {
            return await storageProvider.upload(target, filePath, {
                originalName: plan.metadata.name,
                mimeType: plan.metadata.mimeType,
            });
        });

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

        console.log(`[StandardUploadStrategy] Saved file in database with ID: ${savedFile.id}`);

        await globalUploadSessionService.updateSessionStatus(session.id, "COMPLETED", {
            fileId: savedFile.id,
        });

        try {
            await createPreviewJob(savedFile.id);
            console.log(`[StandardUploadStrategy] Scheduled preview generation job for file: ${savedFile.id}`);
        } catch (previewErr) {
            console.error(`⚠️ [StandardUploadStrategy] Failed to schedule preview job:`, previewErr);
        }

        return { file: savedFile, deduplicated: false };
    }
}

export class CompressedUploadStrategy implements IUploadStrategy {
    public async execute(
        session: UploadSession,
        plan: UploadPlan,
        payload: UploadPayload,
        storageProvider: IUploadStorageProvider
    ): Promise<UploadResult> {
        const { filePath, folderId } = payload;
        const { target, dbFolderId } = await resolveTelegramTarget(folderId);

        const uploadPath = plan.targetFilePath || filePath;
        console.log(`[CompressedUploadStrategy] Uploading compressed file: ${plan.metadata.name} (source: ${uploadPath})`);
        const uploadResult = await globalRetryEngine.executeWithRetry(session.id, async () => {
            return await storageProvider.upload(target, uploadPath, {
                originalName: plan.metadata.name,
                mimeType: plan.metadata.mimeType,
            });
        });

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

        console.log(`[CompressedUploadStrategy] Saved file in database with ID: ${savedFile.id}`);

        await globalUploadSessionService.updateSessionStatus(session.id, "COMPLETED", {
            fileId: savedFile.id,
        });

        try {
            await createPreviewJob(savedFile.id);
            console.log(`[CompressedUploadStrategy] Scheduled preview generation job for file: ${savedFile.id}`);
        } catch (previewErr) {
            console.error(`⚠️ [CompressedUploadStrategy] Failed to schedule preview job:`, previewErr);
        }

        return { file: savedFile, deduplicated: false };
    }
}

export class ChunkedUploadStrategy implements IUploadStrategy {
    public async execute(
        session: UploadSession,
        plan: UploadPlan,
        payload: UploadPayload,
        storageProvider: IUploadStorageProvider
    ): Promise<UploadResult> {
        console.log(`[ChunkedUploadStrategy] Uploading in block fallback mode...`);
        const { filePath, folderId } = payload;
        const { target, dbFolderId } = await resolveTelegramTarget(folderId);

        const uploadPath = plan.targetFilePath || filePath;
        const uploadResult = await globalRetryEngine.executeWithRetry(session.id, async () => {
            return await storageProvider.upload(target, uploadPath, {
                originalName: plan.metadata.name,
                mimeType: plan.metadata.mimeType,
            });
        });

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

        console.log(`[ChunkedUploadStrategy] Saved file in database with ID: ${savedFile.id}`);

        await globalUploadSessionService.updateSessionStatus(session.id, "COMPLETED", {
            fileId: savedFile.id,
        });

        try {
            await createPreviewJob(savedFile.id);
            console.log(`[ChunkedUploadStrategy] Scheduled preview generation job for file: ${savedFile.id}`);
        } catch (previewErr) {
            console.error(`⚠️ [ChunkedUploadStrategy] Failed to schedule preview job:`, previewErr);
        }

        return { file: savedFile, deduplicated: false };
    }
}

export class UploadStrategyRegistry {
    private static strategies: Record<string, IUploadStrategy> = {
        STANDARD: new StandardUploadStrategy(),
        COMPRESSED: new CompressedUploadStrategy(),
        CHUNKED: new ChunkedUploadStrategy(),
        DUPLICATE_REUSE: new DuplicateReuseStrategy(),
    };

    public static getStrategy(type: string): IUploadStrategy {
        const strategy = this.strategies[type];
        if (!strategy) {
            throw new Error(`Unsupported upload strategy type: ${type}`);
        }
        return strategy;
    }
}
