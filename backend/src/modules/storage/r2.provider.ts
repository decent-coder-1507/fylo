import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { StorageProvider, UploadOptions } from "./storage.provider";

/**
 * Cloudflare R2 / S3-compatible storage engine implementation.
 * Stores files as objects in a bucket.
 */
export class R2StorageProvider implements StorageProvider {
    readonly name = "r2";
    private readonly s3: S3Client;
    private readonly bucketName: string;
    private readonly publicUrlPrefix?: string;

    constructor() {
        this.bucketName = process.env.R2_BUCKET_NAME || "";
        this.publicUrlPrefix = process.env.R2_PUBLIC_URL_PREFIX;

        this.s3 = new S3Client({
            endpoint: process.env.R2_ENDPOINT, // E.g., https://<account_id>.r2.cloudflarestorage.com
            region: "auto",
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
            },
            // Force path style is useful for certain S3-compatible systems, but auto handles it
            forcePathStyle: true,
        });
    }

    /**
     * Uploads the buffer to the R2 bucket.
     */
    public async upload(buffer: Buffer, options: UploadOptions): Promise<string> {
        if (!this.bucketName) {
            throw new Error("R2_BUCKET_NAME environment variable is not defined");
        }

        // Build object key
        const rawKey = options.folder ? `${options.folder}/${options.fileName}` : options.fileName;
        const cleanKey = rawKey.replace(/\\/g, "/").replace(/\/+/g, "/");

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: cleanKey,
            Body: buffer,
            ContentType: options.mimeType,
        });

        await this.s3.send(command);

        // Build the public URL
        let publicUrl = "";
        if (this.publicUrlPrefix) {
            const normalizedPrefix = this.publicUrlPrefix.replace(/\/$/, "");
            publicUrl = `${normalizedPrefix}/${cleanKey}`;
        } else {
            // Default to path style URL based on the endpoint
            const endpoint = (process.env.R2_ENDPOINT || "").replace(/\/$/, "");
            publicUrl = `${endpoint}/${this.bucketName}/${cleanKey}`;
        }

        return publicUrl;
    }

    /**
     * Deletes the object from the R2 bucket.
     */
    public async delete(url: string): Promise<void> {
        if (!url || !this.bucketName) return;

        try {
            let key = "";

            // 1. Try resolving using public URL prefix
            if (this.publicUrlPrefix) {
                const normalizedPrefix = this.publicUrlPrefix.replace(/\/$/, "");
                if (url.startsWith(normalizedPrefix)) {
                    key = url.slice(normalizedPrefix.length + 1);
                }
            }

            // 2. Try resolving via bucket path name
            if (!key) {
                const bucketSearch = `/${this.bucketName}/`;
                const index = url.indexOf(bucketSearch);
                if (index !== -1) {
                    key = url.slice(index + bucketSearch.length);
                } else {
                    // Fallback to parsing URL pathname
                    try {
                        const parsedUrl = new URL(url);
                        key = parsedUrl.pathname.replace(/^\//, "");
                        
                        // Strip bucket name prefix if present
                        if (key.startsWith(`${this.bucketName}/`)) {
                            key = key.slice(this.bucketName.length + 1);
                        }
                    } catch {
                        // Use the URL itself as the key if it's not a valid URL
                        key = url;
                    }
                }
            }

            // Clean key (remove query parameters and leading slashes)
            const cleanKey = key.split("?")[0].replace(/^\//, "");

            console.log(`[R2StorageProvider] Deleting object key: ${cleanKey} from bucket: ${this.bucketName}`);
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: cleanKey,
            });

            await this.s3.send(command);
            console.log(`[R2StorageProvider] Successfully deleted key: ${cleanKey}`);
        } catch (err) {
            console.error(`[R2StorageProvider] Failed to delete object at URL ${url}:`, err);
            throw err;
        }
    }
}
