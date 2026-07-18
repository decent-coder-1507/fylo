import fs from "fs";
import crypto from "crypto";
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * Service responsible for generating file checksums to support
 * file integrity verification and deduplication.
 */
export class ChecksumService {
    /**
     * Generates a BLAKE3 checksum for a file on disk.
     * Uses streams to process the file in chunks, ensuring memory efficiency for large files.
     * 
     * @param filePath - Path to the file on disk
     * @returns Promise<string> - The hex digest of the BLAKE3 hash
     */
    public async generateBlake3(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hasher = blake3.create();
            const stream = fs.createReadStream(filePath);

            stream.on("data", (chunk) => {
                if (typeof chunk === "string") {
                    hasher.update(new TextEncoder().encode(chunk));
                } else {
                    hasher.update(chunk as Uint8Array);
                }
            });

            stream.on("end", () => {
                resolve(bytesToHex(hasher.digest()));
            });

            stream.on("error", (error) => {
                reject(error);
            });
        });
    }

    /**
     * Generates a BLAKE3 checksum for a specific slice/chunk of a file.
     * Uses fs.createReadStream with start and end options to read the chunk.
     * 
     * @param filePath - Path to the file on disk
     * @param offset - The start byte offset of the slice
     * @param size - The size of the slice in bytes
     * @returns Promise<string> - The hex digest of the BLAKE3 hash
     */
    public async generateBlake3ForSlice(filePath: string, offset: number, size: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const hasher = blake3.create();
            const stream = fs.createReadStream(filePath, {
                start: offset,
                end: offset + size - 1,
            });

            stream.on("data", (chunk) => {
                if (typeof chunk === "string") {
                    hasher.update(new TextEncoder().encode(chunk));
                } else {
                    hasher.update(chunk as Uint8Array);
                }
            });

            stream.on("end", () => {
                resolve(bytesToHex(hasher.digest()));
            });

            stream.on("error", (error) => {
                reject(error);
            });
        });
    }

    /**
     * Generates a SHA-256 checksum for a file on disk.
     * Uses streams to process the file in chunks, ensuring memory efficiency for large files.
     * 
     * @param filePath - Path to the file on disk
     * @returns Promise<string> - The hex digest of the SHA-256 hash
     */
    public async generateSha256(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash("sha256");
            const stream = fs.createReadStream(filePath);

            stream.on("data", (chunk) => {
                hash.update(chunk);
            });

            stream.on("end", () => {
                resolve(hash.digest("hex"));
            });

            stream.on("error", (error) => {
                reject(error);
            });
        });
    }
}

// Export a global service instance
export const globalChecksumService = new ChecksumService();
