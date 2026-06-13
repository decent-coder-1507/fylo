import fs from "fs";
import path from "path";
import { StorageProvider, UploadOptions } from "./storage.provider";

/**
 * Local storage engine implementation.
 * Stores files on the local disk and returns relative URLs.
 */
export class LocalStorageProvider implements StorageProvider {
    readonly name = "local";
    private readonly baseDir: string;

    constructor() {
        this.baseDir = path.join(process.cwd(), "uploads", "previews");
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }

    /**
     * Writes the buffer to the local filesystem.
     */
    public async upload(buffer: Buffer, options: UploadOptions): Promise<string> {
        // Build subfolder if specified
        const folderPath = options.folder ? path.join(this.baseDir, options.folder) : this.baseDir;
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const filePath = path.join(folderPath, options.fileName);
        await fs.promises.writeFile(filePath, buffer);

        // Return a relative URL path (standard format used in backend endpoints)
        const relativePath = options.folder 
            ? path.join("uploads", "previews", options.folder, options.fileName)
            : path.join("uploads", "previews", options.fileName);

        // Replace backslashes with forward slashes for URL path web compatibility
        return relativePath.replace(/\\/g, "/");
    }

    /**
     * Removes the file from the local filesystem.
     */
    public async delete(url: string): Promise<void> {
        if (!url) return;

        // Clean up URL prefix to map it back to physical path
        const cleanedUrl = url.replace(/^\//, "");
        const physicalPath = path.join(process.cwd(), cleanedUrl);

        try {
            if (fs.existsSync(physicalPath)) {
                await fs.promises.unlink(physicalPath);
                console.log(`[LocalStorageProvider] Deleted file: ${physicalPath}`);
            } else {
                console.warn(`[LocalStorageProvider] File to delete not found: ${physicalPath}`);
            }
        } catch (err) {
            console.error(`[LocalStorageProvider] Failed to delete file: ${physicalPath}`, err);
            throw err;
        }
    }
}
