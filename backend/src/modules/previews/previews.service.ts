import { createPreview, getPreviewByFileId, findPendingPreviews } from "./previews.repository";
import { globalPreviewQueueClient } from "./preview.queue";
import { globalPreviewManager } from "./preview.manager";
import { PreviewStatus } from "@prisma/client";
import prisma from "../../lib/db/prisma";
import fs from "fs";
import path from "path";
import { client } from "../../lib/telegram/client";
import { Api } from "telegram";
import bigInt from "big-integer";

/**
 * Creates and registers a new preview job in the database.
 * 
 * @param fileId - Database ID of the File to generate a preview for
 * @returns The created FilePreview record
 */
export const createPreviewJob = async (fileId: string) => {
    // 1. Create the database record representing the preview job
    const preview = await createPreview({
        fileId,
        status: PreviewStatus.PENDING,
    });

    // 2. Schedule the job by publishing it to RabbitMQ queue
    const queued = await globalPreviewQueueClient.publishJob(fileId);
    if (!queued) {
        console.warn(`[PreviewService] Job creation succeeded but failed to queue to RabbitMQ for file: ${fileId}`);
    }

    return preview;
};

/**
 * Manually executes a preview job by invoking the orchestrator.
 * 
 * @param fileId - Database ID of the File
 */
export const executePreviewJob = async (fileId: string) => {
    console.log(`[PreviewService] Manually triggering execution for file ID: ${fileId}`);
    return globalPreviewManager.processFilePreview(fileId);
};

/**
 * Queries and reschedules all pending or previously failed jobs under maximum retry threshold.
 * Helpful for recovering queue messages on worker startup or system boot.
 */
export const rescheduleAllPendingJobs = async () => {
    const pendingJobs = await findPendingPreviews(100);
    console.log(`[PreviewService] Rescheduling ${pendingJobs.length} pending/failed jobs.`);
    
    let count = 0;
    for (const job of pendingJobs) {
        if (job.attempts < job.maxAttempts) {
            const queued = await globalPreviewQueueClient.publishJob(job.fileId);
            if (queued) count++;
        }
    }
    console.log(`[PreviewService] Successfully rescheduled ${count} jobs.`);
    return count;
};

/**
 * Retrieves the status and run metrics of a preview job.
 * 
 * @param fileId - Database ID of the File
 */
export const getPreviewJobStatus = async (fileId: string) => {
    const preview = await getPreviewByFileId(fileId);
    if (!preview) return null;

    return {
        id: preview.id,
        fileId: preview.fileId,
        status: preview.status,
        attempts: preview.attempts,
        maxAttempts: preview.maxAttempts,
        error: preview.error,
        lastAttemptAt: preview.lastAttemptAt,
        startedAt: preview.startedAt,
        completedAt: preview.completedAt,
    };
};

/**
 * Retrieves the preview record for a file. If no preview record exists, 
 * it automatically creates and queues a new preview generation job.
 * 
 * @param fileId - The unique file ID
 */
export const getOrCreateFilePreview = async (fileId: string) => {
    // 1. Verify that the file exists in the database
    const fileRecord = await prisma.file.findUnique({
        where: { id: fileId }
    });
    if (!fileRecord) {
        throw new Error("File not found");
    }

    // 2. Fetch the preview record
    let preview = await getPreviewByFileId(fileId);

    // 3. If no preview record exists, start a new preview generation job on-demand
    if (!preview) {
        console.log(`[PreviewService] No preview record found for file ${fileId}. Spawning new preview job.`);
        preview = await createPreviewJob(fileId);
    }

    return preview;
};

/**
 * Resolves the preview or thumbnail file details.
 * 
 * @param fileId - The unique file ID
 * @param type - Either 'thumbnail' or 'preview'
 * @returns Details of the asset, including whether it's local or remote
 */
export const getLocalPreviewAsset = async (fileId: string, type: "thumbnail" | "preview") => {
    const preview = await getPreviewByFileId(fileId);
    if (!preview) {
        throw new Error("Preview not found");
    }

    if (preview.status !== PreviewStatus.COMPLETED) {
        throw new Error(`Preview is not ready yet (Current status: ${preview.status})`);
    }

    const relativePath = type === "thumbnail" ? preview.thumbnailUrl : preview.previewUrl;
    const mimeType = type === "thumbnail" ? preview.thumbnailMimeType : preview.previewMimeType;

    if (!relativePath) {
        throw new Error(`No ${type} URL available for this preview`);
    }

    // If it's a remote URL (e.g. Cloudinary or Cloudflare R2), flag it so controller can redirect
    if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
        return { isRemote: true, url: relativePath };
    }

    // Resolve physical path on disk for local assets
    const physicalPath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(physicalPath)) {
        throw new Error(`${type} file not found on disk`);
    }

    return {
        isRemote: false,
        physicalPath,
        mimeType: mimeType || "application/octet-stream",
    };
};

/**
 * Helper to determine if a file is a supported text-based format and identify the coding language.
 */
export const getTextFileTypeInfo = (mimeType: string | null, fileName: string) => {
    const ext = path.extname(fileName).toLowerCase();
    const mime = (mimeType || "").toLowerCase();

    // 1. Markdown
    if (ext === ".md" || ext === ".markdown" || mime === "text/markdown") {
        return { isText: true, type: "markdown", language: "markdown" };
    }

    // 2. JSON
    if (ext === ".json" || mime === "application/json") {
        return { isText: true, type: "json", language: "json" };
    }

    // 3. Common Code Extensions
    const codeExtensions: Record<string, string> = {
        ".js": "javascript",
        ".jsx": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".html": "html",
        ".htm": "html",
        ".css": "css",
        ".py": "python",
        ".go": "go",
        ".rs": "rust",
        ".java": "java",
        ".cpp": "cpp",
        ".c": "c",
        ".h": "cpp",
        ".cs": "csharp",
        ".sh": "bash",
        ".bash": "bash",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".xml": "xml",
        ".sql": "sql",
        ".ini": "ini",
        ".toml": "toml",
        ".php": "php",
        ".rb": "ruby",
        ".swift": "swift",
        ".kt": "kotlin",
        ".scala": "scala",
        ".gradle": "groovy",
        ".dockerfile": "dockerfile",
        "dockerfile": "dockerfile"
    };

    if (codeExtensions[ext] || codeExtensions[fileName.toLowerCase()]) {
        return { isText: true, type: "code", language: codeExtensions[ext] || codeExtensions[fileName.toLowerCase()] };
    }

    // 4. Plain Text
    const textMimeTypes = ["text/plain", "text/csv", "text/tab-separated-values"];
    if (ext === ".txt" || ext === ".csv" || textMimeTypes.includes(mime) || mime.startsWith("text/")) {
        return { isText: true, type: "text", language: "plaintext" };
    }

    return { isText: false, type: null, language: null };
};

/**
 * Resolves preview content for text-based files by downloading from Telegram and formatting.
 * 
 * @param fileId - The unique file ID
 * @returns Structured text preview payload
 */
export const getTextPreviewContent = async (fileId: string) => {
    // 1. Verify file exists
    const fileRecord = await prisma.file.findUnique({
        where: { id: fileId },
        include: { folder: true }
    });
    if (!fileRecord) {
        throw new Error("File not found");
    }

    // 2. Identify the file type
    const fileTypeInfo = getTextFileTypeInfo(fileRecord.mimeType, fileRecord.name);
    if (!fileTypeInfo.isText) {
        throw new Error("File is not a supported text/code format");
    }

    // 3. Download the media from Telegram
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

    const messages = await client.getMessages(target, {
        ids: [fileRecord.telegramMessageId],
    });

    const message = messages[0];
    if (!message || !message.media) {
        throw new Error("File media not found in Telegram");
    }

    const buffer = await client.downloadMedia(message);
    if (!buffer) {
        throw new Error("Failed to download file content from Telegram");
    }

    // 4. Decode to UTF-8
    let contentStr = buffer.toString("utf8");

    // 5. Handle truncation (cap at 100KB for previews)
    const MAX_PREVIEW_CHARS = 100 * 1024;
    let isTruncated = false;
    if (contentStr.length > MAX_PREVIEW_CHARS) {
        contentStr = contentStr.slice(0, MAX_PREVIEW_CHARS);
        isTruncated = true;
    }

    return {
        type: fileTypeInfo.type,
        language: fileTypeInfo.language,
        content: contentStr,
        isTruncated,
        size: fileRecord.size,
    };
};
