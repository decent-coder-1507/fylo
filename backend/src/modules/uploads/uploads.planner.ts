import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import prisma from "../../lib/db/prisma";
import { UploadMetadata, UploadPlan } from "./uploads.types";
import { globalChecksumService } from "./checksum.service";
import { globalCompressionService } from "./compression.service";

/**
 * UploadPlanner is responsible for analyzing file characteristics and
 * generating an UploadPlan detailing how the upload should be executed
 * (e.g. single-part vs. multi-part chunked).
 */
export class UploadPlanner {
    private readonly defaultChunkSize: number;
    private readonly telegramMaxFileSize: number;

    constructor(
        defaultChunkSize: number = 20 * 1024 * 1024,
        telegramMaxFileSize: number = 2 * 1024 * 1024 * 1024 // 2 GB Telegram Limit
    ) {
        this.defaultChunkSize = defaultChunkSize;
        this.telegramMaxFileSize = telegramMaxFileSize;
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
        let isDirectory = false;
        try {
            if (filePath && fs.existsSync(filePath)) {
                isDirectory = fs.statSync(filePath).isDirectory();
            }
        } catch {}

        const shouldCompress = filePath ? globalCompressionService.shouldCompress(filePath, name, isDirectory) : false;

        let compressionDetails = {
            shouldCompress: false,
            algorithm: null as "gzip" | "zip" | null,
            expectedCompressionRatio: 1.0,
            compressedPath: undefined as string | undefined
        };
        let finalFilePath = filePath;
        let finalMetadata: UploadMetadata;
        let originalMetadata: UploadMetadata | undefined;

        if (shouldCompress && filePath) {
            const compResult = await globalCompressionService.compress(filePath, name, isDirectory);
            compressionDetails = {
                shouldCompress: true,
                algorithm: compResult.algorithm,
                expectedCompressionRatio: Number((compResult.size / size).toFixed(4)),
                compressedPath: compResult.compressedPath
            };
            finalFilePath = compResult.compressedPath;

            // Compute original file checksum (for directories, we set to empty or archive checksum)
            const origChecksum = isDirectory ? "" : await globalChecksumService.generateBlake3(filePath);
            originalMetadata = {
                name,
                size,
                mimeType: mimeType || (isDirectory ? "application/x-directory" : "application/octet-stream"),
                extension: isDirectory ? "" : path.extname(name).toLowerCase(),
                checksum: origChecksum,
                checksumType: "blake3"
            };

            const compExt = compResult.algorithm === "zip" ? ".zip" : ".gz";
            const compName = name.endsWith(compExt) ? name : name + compExt;
            finalMetadata = {
                name: compName,
                size: compResult.size,
                mimeType: compResult.algorithm === "zip" ? "application/zip" : "application/gzip",
                extension: compExt,
                checksum: compResult.checksum,
                checksumType: "blake3"
            };
        } else {
            finalMetadata = await this.analyze(filePath, name, size, mimeType);
            
            const compressibleExtensions = [".txt", ".json", ".csv", ".xml", ".html", ".log", ".css", ".js", ".md"];
            const ext = path.extname(name).toLowerCase();
            const likelyCompressible = compressibleExtensions.includes(ext);
            
            compressionDetails = {
                shouldCompress: likelyCompressible,
                algorithm: likelyCompressible ? "gzip" : null,
                expectedCompressionRatio: likelyCompressible ? 0.3 : 1.0,
                compressedPath: undefined
            };
        }

        const planSize = finalMetadata.size;
        
        let isDuplicate = false;
        if (finalMetadata.checksum) {
            const existingFile = await prisma.file.findFirst({
                where: { checksum: finalMetadata.checksum },
                select: { id: true }
            });
            isDuplicate = !!existingFile;
        }

        let strategy: UploadPlan["strategy"];
        if (isDuplicate) {
            strategy = "DUPLICATE_REUSE";
        } else if (planSize > this.telegramMaxFileSize) {
            strategy = "CHUNKED"; // Exceeds Telegram single-file limit
        } else if (compressionDetails.shouldCompress) {
            strategy = "COMPRESSED";
        } else if (planSize > this.defaultChunkSize) {
            strategy = "CHUNKED";
        } else {
            strategy = "STANDARD";
        }

        const isChunked = strategy === "CHUNKED";
        const concurrency = isChunked ? 3 : 1;

        const chunkSize = isChunked ? this.defaultChunkSize : planSize;
        const totalChunks = isChunked ? Math.ceil(planSize / chunkSize) : 1;

        const chunks: UploadPlan["chunks"] = [];
        for (let i = 0; i < totalChunks; i++) {
            const offset = i * chunkSize;
            const currentChunkSize = i === totalChunks - 1 ? planSize - offset : chunkSize;

            let chunkChecksum: string | undefined = undefined;
            if (filePath && fs.existsSync(filePath)) {
                try {
                    chunkChecksum = await globalChecksumService.generateBlake3ForSlice(filePath, offset, currentChunkSize);
                } catch (checksumErr) {
                    console.error(`⚠️ Failed to generate checksum for chunk ${i}:`, checksumErr);
                }
            }

            chunks.push({
                index: i,
                size: currentChunkSize,
                offset,
                status: "pending",
                checksum: chunkChecksum,
            });
        }

        const sessionId = randomUUID();

        return {
            sessionId,
            metadata: finalMetadata,
            strategy,
            concurrency,
            compression: {
                shouldCompress: compressionDetails.shouldCompress,
                algorithm: compressionDetails.algorithm,
                expectedCompressionRatio: compressionDetails.expectedCompressionRatio,
                compressedPath: compressionDetails.compressedPath,
            },
            estimatedSize: Math.round(size * compressionDetails.expectedCompressionRatio),
            targetFilePath: finalFilePath,
            originalMetadata,
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
