import { randomUUID } from "crypto";
import path from "path";
import { UploadMetadata, UploadPlan } from "./uploads.types";
import { globalChecksumService } from "./checksum.service";

/**
 * UploadPlanner is responsible for analyzing file characteristics and
 * generating an UploadPlan detailing how the upload should be executed
 * (e.g. single-part vs. multi-part chunked).
 */
export class UploadPlanner {
    private readonly defaultChunkSize: number;

    constructor(defaultChunkSize: number = 20 * 1024 * 1024) { // 20 MB default chunk threshold
        this.defaultChunkSize = defaultChunkSize;
    }

    /**
     * Gathers and extracts file metadata such as name, size, type, and extension.
     */
    public async analyze(
        filePath: string | undefined,
        name: string,
        size: number,
        mimeType?: string
    ): Promise<UploadMetadata> {
        const extension = path.extname(name).toLowerCase();
        const type = mimeType || "application/octet-stream";
        const checksum = filePath ? await globalChecksumService.generateBlake3(filePath) : "";

        return {
            name,
            size,
            mimeType: type,
            extension,
            checksum,
            checksumType: "blake3",
        };
    }

    /**
     * Generates an execution plan describing how the file should be uploaded.
     * Decisions about chunking threshold, strategy, compression, and concurrency are mapped here.
     */
    public async createPlan(
        filePath: string | undefined,
        name: string,
        size: number,
        mimeType?: string
    ): Promise<UploadPlan> {
        const metadata = await this.analyze(filePath, name, size, mimeType);
        
        // 1. Compression Decisions
        // Compress highly-compressible text/log formats
        const compressibleExtensions = [".txt", ".json", ".csv", ".xml", ".html", ".log", ".css", ".js", ".md"];
        const shouldCompress = compressibleExtensions.includes(metadata.extension);
        const algorithm = shouldCompress ? "gzip" : null;
        const expectedCompressionRatio = shouldCompress ? 0.3 : 1.0;
        const estimatedSize = Math.round(size * expectedCompressionRatio);

        // 2. Upload Strategy & Concurrency
        const isChunked = size > this.defaultChunkSize;
        const strategy = isChunked ? "CHUNKED" : "DIRECT";
        const concurrency = isChunked ? 3 : 1;

        // 3. Chunk Planning
        const chunkSize = isChunked ? this.defaultChunkSize : size;
        const totalChunks = isChunked ? Math.ceil(size / this.defaultChunkSize) : 1;

        const chunks: UploadPlan["chunks"] = [];
        for (let i = 0; i < totalChunks; i++) {
            const offset = i * this.defaultChunkSize;
            const currentChunkSize = i === totalChunks - 1 ? size - offset : this.defaultChunkSize;
            chunks.push({
                index: i,
                size: currentChunkSize,
                offset,
                status: "pending",
            });
        }

        const sessionId = randomUUID();

        return {
            sessionId,
            metadata,
            strategy,
            concurrency,
            compression: {
                shouldCompress,
                algorithm,
                expectedCompressionRatio,
            },
            estimatedSize,
            chunkPlanning: {
                isChunked,
                chunkSize,
                totalChunks,
                chunks,
            },
            // Root properties for backward compatibility
            isChunked,
            chunkSize,
            totalChunks,
            chunks,
        };
    }
}

// Export a global planner instance
export const globalUploadPlanner = new UploadPlanner();
