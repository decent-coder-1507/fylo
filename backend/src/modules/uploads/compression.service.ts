import fs from "fs";
import path from "path";
import zlib from "zlib";
import * as archiver from "archiver";
import { randomUUID } from "crypto";
import os from "os";
import { globalChecksumService } from "./checksum.service";

export interface CompressionResult {
    compressedPath: string;
    algorithm: "zip" | "gzip";
    size: number;
    checksum: string;
}

export class CompressionService {
    private readonly compressibleExtensions = new Set([
        ".txt", ".json", ".csv", ".xml", ".html", ".log", ".css", ".js", ".md"
    ]);

    private readonly minCompressSize = 1024; // 1 KB min size for compression

    /**
     * Determines whether compression is beneficial for a file/directory.
     */
    public shouldCompress(filePath: string, name: string, isDirectory: boolean): boolean {
        if (isDirectory) {
            // Directories must always be packaged to be uploaded
            return true;
        }

        const extension = path.extname(name).toLowerCase();
        if (!this.compressibleExtensions.has(extension)) {
            return false;
        }

        try {
            const stats = fs.statSync(filePath);
            return stats.size >= this.minCompressSize;
        } catch {
            return false;
        }
    }

    /**
     * Compresses a file or directory and returns details of the compressed artifact.
     */
    public async compress(
        filePath: string,
        name: string,
        isDirectory: boolean
    ): Promise<CompressionResult> {
        const tempDir = path.join(os.tmpdir(), "telestore-compression");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        if (isDirectory) {
            const targetZipPath = path.join(tempDir, `${name}-${randomUUID()}.zip`);
            await this.zipDirectory(filePath, targetZipPath);
            const stats = fs.statSync(targetZipPath);
            const checksum = await globalChecksumService.generateBlake3(targetZipPath);

            return {
                compressedPath: targetZipPath,
                algorithm: "zip",
                size: stats.size,
                checksum,
            };
        } else {
            const targetGzipPath = path.join(tempDir, `${name}-${randomUUID()}.gz`);
            await this.gzipFile(filePath, targetGzipPath);
            const stats = fs.statSync(targetGzipPath);
            const checksum = await globalChecksumService.generateBlake3(targetGzipPath);

            return {
                compressedPath: targetGzipPath,
                algorithm: "gzip",
                size: stats.size,
                checksum,
            };
        }
    }

    /**
     * Packages a directory recursively into a ZIP archive using a streaming pipeline.
     */
    private zipDirectory(sourceDir: string, outPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outPath);
            const archive = new (archiver as any).ZipArchive({ zlib: { level: 9 } });

            output.on("close", () => resolve());
            archive.on("error", (err: any) => reject(err));

            archive.pipe(output);
            archive.directory(sourceDir, false);
            archive.finalize();
        });
    }

    /**
     * Compresses a single file into a Gzip archive using a streaming pipeline.
     */
    private gzipFile(sourceFile: string, outPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const source = fs.createReadStream(sourceFile);
            const destination = fs.createWriteStream(outPath);
            const gzip = zlib.createGzip({ level: 9 });

            destination.on("close", () => resolve());
            source.on("error", (err: any) => reject(err));
            destination.on("error", (err) => reject(err));
            gzip.on("error", (err) => reject(err));

            source.pipe(gzip).pipe(destination);
        });
    }
}

export const globalCompressionService = new CompressionService();
