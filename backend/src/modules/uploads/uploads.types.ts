import { File } from "@prisma/client";

/**
 * Payload representing a file upload request.
 */
export interface UploadPayload {
    filePath: string;
    originalName: string;
    mimeType?: string;
    size: number;
    folderId?: string;
    sessionId?: string;
}

/**
 * Result returned after a successful upload orchestration.
 */
export interface UploadResult {
    file: File;
}

/**
 * Storage interaction contract for uploading files to target backends.
 */
export interface IUploadStorageProvider {
    readonly name: string;
    
    /**
     * Uploads a local file to the storage provider.
     */
    upload(
        target: any,
        filePath: string,
        options?: { originalName: string; mimeType?: string }
    ): Promise<{ telegramMessageId: number }>;
}

/**
 * File metadata collected by the analyzer.
 */
export interface UploadMetadata {
    name: string;
    size: number;
    mimeType: string;
    extension: string;
    checksum: string;
    checksumType: string;
}

/**
 * Represents the plan describing how a file should be uploaded.
 */
export interface UploadPlan {
    sessionId: string;
    metadata: UploadMetadata;
    strategy: "DIRECT" | "CHUNKED";
    concurrency: number;
    compression: {
        shouldCompress: boolean;
        algorithm: "gzip" | null;
        expectedCompressionRatio: number;
    };
    estimatedSize: number;
    chunkPlanning: {
        isChunked: boolean;
        chunkSize: number;
        totalChunks: number;
        chunks: {
            index: number;
            size: number;
            offset: number;
            status: "pending" | "completed" | "failed";
            telegramMessageId?: number;
        }[];
    };
    
    // Root properties preserved for backward compatibility
    isChunked: boolean;
    chunkSize: number;
    totalChunks: number;
    chunks: {
        index: number;
        size: number;
        offset: number;
        status: "pending" | "completed" | "failed";
        telegramMessageId?: number;
    }[];
}

/**
 * Represents a session managing the upload lifecycle.
 */
export interface UploadSession {
    id: string;
    fileName: string;
    mimeType?: string;
    size: number;
    folderId?: string;
    status: "CREATED" | "UPLOADING" | "COMPLETED" | "FAILED";
    checksum?: string;
    isChunked: boolean;
    totalChunks: number;
    plan?: UploadPlan;
    fileId?: string;
    createdAt: Date;
    updatedAt: Date;
}
