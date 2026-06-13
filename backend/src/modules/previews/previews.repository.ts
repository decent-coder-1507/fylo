import prisma from "../../lib/db/prisma";
import { PreviewStatus, Prisma } from "@prisma/client";

/**
 * Creates a new FilePreview record for a file.
 * 
 * @param data - The preview creation data
 * @param tx - Optional Prisma transaction client
 */
export const createPreview = async (
    data: Prisma.FilePreviewUncheckedCreateInput,
    tx?: Prisma.TransactionClient
) => {
    const client = tx || prisma;
    return client.filePreview.create({
        data,
    });
};

/**
 * Retrieves a preview record by its associated file ID.
 * 
 * @param fileId - The unique file ID
 * @param tx - Optional Prisma transaction client
 */
export const getPreviewByFileId = async (
    fileId: string,
    tx?: Prisma.TransactionClient
) => {
    const client = tx || prisma;
    return client.filePreview.findUnique({
        where: { fileId },
    });
};

/**
 * Updates the status of a file preview.
 * 
 * @param fileId - The unique file ID
 * @param status - The new PreviewStatus
 * @param tx - Optional Prisma transaction client
 */
export const updateStatus = async (
    fileId: string,
    status: PreviewStatus,
    tx?: Prisma.TransactionClient
) => {
    const client = tx || prisma;
    return client.filePreview.update({
        where: { fileId },
        data: { status },
    });
};

/**
 * Marks a preview as currently processing, updating its startedAt timestamp and status.
 * Resets any previous error message to start fresh.
 * 
 * @param fileId - The unique file ID
 * @param tx - Optional Prisma transaction client
 */
export const markProcessing = async (
    fileId: string,
    tx?: Prisma.TransactionClient
) => {
    const client = tx || prisma;
    return client.filePreview.update({
        where: { fileId },
        data: {
            status: PreviewStatus.PROCESSING,
            startedAt: new Date(),
            error: null,
        },
    });
};

/**
 * Marks the preview as successfully generated and stores thumbnail/preview details.
 * 
 * @param fileId - The unique file ID
 * @param data - Details about the generated thumbnail, preview resources, and metadata
 * @param tx - Optional Prisma transaction client
 */
export const markSuccess = async (
    fileId: string,
    data: {
        thumbnailUrl?: string | null;
        thumbnailSize?: number | null;
        thumbnailMimeType?: string | null;
        previewUrl?: string | null;
        previewMimeType?: string | null;
        previewSize?: number | null;
        metadata?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient
) => {
    const client = tx || prisma;
    return client.filePreview.update({
        where: { fileId },
        data: {
            ...data,
            status: PreviewStatus.COMPLETED,
            completedAt: new Date(),
            error: null,
        },
    });
};

/**
 * Marks the preview processing as failed and records the error message.
 * 
 * @param fileId - The unique file ID
 * @param error - The error description or stack trace
 * @param tx - Optional Prisma transaction client
 */
export const markFailed = async (
    fileId: string,
    error: string,
    tx?: Prisma.TransactionClient
) => {
    const client = tx || prisma;
    return client.filePreview.update({
        where: { fileId },
        data: {
            status: PreviewStatus.FAILED,
            error,
        },
    });
};

/**
 * Updates the metadata JSON payload for a file preview.
 * 
 * @param fileId - The unique file ID
 * @param metadata - The new JSON metadata payload
 * @param tx - Optional Prisma transaction client
 */
export const updateMetadata = async (
    fileId: string,
    metadata: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient
) => {
    const client = tx || prisma;
    return client.filePreview.update({
        where: { fileId },
        data: { metadata },
    });
};

/**
 * Increments the retry attempts count and sets the lastAttemptAt timestamp.
 * Optionally updates the error field with the latest failure reason.
 * 
 * @param fileId - The unique file ID
 * @param error - Optional latest error description
 * @param tx - Optional Prisma transaction client
 */
export const incrementRetries = async (
    fileId: string,
    error?: string,
    tx?: Prisma.TransactionClient
) => {
    const client = tx || prisma;
    return client.filePreview.update({
        where: { fileId },
        data: {
            attempts: {
                increment: 1,
            },
            lastAttemptAt: new Date(),
            ...(error && { error }),
        },
    });
};

/**
 * Finds pending preview tasks that need processing.
 * 
 * @param limit - Max number of tasks to retrieve
 * @param tx - Optional Prisma transaction client
 */
export const findPendingPreviews = async (
    limit: number = 10,
    tx?: Prisma.TransactionClient
) => {
    const client = tx || prisma;
    return client.filePreview.findMany({
        where: {
            status: PreviewStatus.PENDING,
        },
        orderBy: {
            createdAt: "asc",
        },
        take: limit,
    });
};

/**
 * Finds processing previews that have timed out / stalled.
 * Useful for automated recovery workers to reset or fail stalled tasks.
 * 
 * @param threshold - Date threshold (older than this will be considered stalled)
 * @param tx - Optional Prisma transaction client
 */
export const findStalledPreviews = async (
    threshold: Date,
    tx?: Prisma.TransactionClient
) => {
    const client = tx || prisma;
    return client.filePreview.findMany({
        where: {
            status: PreviewStatus.PROCESSING,
            startedAt: {
                lt: threshold,
            },
        },
    });
};
