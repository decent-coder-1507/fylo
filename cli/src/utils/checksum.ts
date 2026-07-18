import fs from "fs";
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * Generates a BLAKE3 checksum for a file on disk.
 * Uses streams to process the file in chunks, ensuring memory efficiency for large files.
 * 
 * @param filePath - Path to the file on disk
 * @returns Promise<string> - The hex digest of the BLAKE3 hash
 */
export async function generateBlake3(filePath: string): Promise<string> {
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
