import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import path from "path";
import { StorageProvider, UploadOptions } from "./storage.provider";

/**
 * Cloudinary storage engine implementation.
 * Leverages Cloudinary's CDN, image transformation capabilities, and SDK.
 */
export class CloudinaryStorageProvider implements StorageProvider {
    readonly name = "cloudinary";

    constructor() {
        // Cloudinary SDK automatically configures itself if CLOUDINARY_URL env variable is present.
        // We can also configure it manually using individual variables.
        if (process.env.CLOUDINARY_CLOUD_NAME) {
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            });
        }
    }

    /**
     * Uploads the buffer to Cloudinary using upload_stream.
     */
    public async upload(buffer: Buffer, options: UploadOptions): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // Determine resource type based on MIME
            let resourceType: "image" | "video" | "raw" = "raw";
            if (options.mimeType.startsWith("image/")) {
                resourceType = "image";
            } else if (options.mimeType.startsWith("video/")) {
                resourceType = "video";
            }

            // Folder path configuration
            const targetFolder = options.folder 
                ? `telestore/${options.folder}`.replace(/\/+/g, "/")
                : "telestore";

            // Cloudinary public ID (without extension for images/videos)
            const fileBasename = path.parse(options.fileName).name;
            const publicId = `${fileBasename}_${Date.now()}`;

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: targetFolder,
                    public_id: publicId,
                    resource_type: resourceType,
                },
                (error, result) => {
                    if (error) {
                        console.error("[CloudinaryStorageProvider] Upload failed:", error);
                        reject(new Error(`Cloudinary upload failed: ${error.message}`));
                    } else if (result) {
                        resolve(result.secure_url);
                    } else {
                        reject(new Error("Cloudinary upload failed: no result returned"));
                    }
                }
            );

            // Stream buffer to Cloudinary
            Readable.from(buffer).pipe(uploadStream);
        });
    }

    /**
     * Deletes the asset from Cloudinary by extracting its public ID from the secure URL.
     */
    public async delete(url: string): Promise<void> {
        if (!url) return;

        try {
            // Extract public ID from the URL
            // Match pattern: /upload/(?:v\d+/)?(folder/subfolder/public_id_with_extension)
            const match = url.match(/\/upload\/(?:v\d+\/)?([^\s?#]+)$/);
            if (!match || !match[1]) {
                console.warn(`[CloudinaryStorageProvider] Could not extract public ID from URL: ${url}`);
                return;
            }

            const publicIdWithExt = match[1];
            const parsed = path.parse(publicIdWithExt);

            // Detect resource type from URL path
            const isRaw = url.includes("/raw/upload/");
            const isVideo = url.includes("/video/upload/");
            const resourceType: "image" | "video" | "raw" = isRaw ? "raw" : (isVideo ? "video" : "image");

            // For raw files, Cloudinary public ID includes the extension. 
            // For images/videos, it does not.
            const publicId = resourceType === "raw"
                ? publicIdWithExt
                : path.join(parsed.dir, parsed.name).replace(/\\/g, "/");

            console.log(`[CloudinaryStorageProvider] Deleting public_id: ${publicId} (${resourceType})`);
            const deleteResult = await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType,
                invalidate: true
            });

            if (deleteResult.result !== "ok" && deleteResult.result !== "not found") {
                console.warn(`[CloudinaryStorageProvider] Deletion warning for ${publicId}:`, deleteResult);
            } else {
                console.log(`[CloudinaryStorageProvider] Successfully deleted asset: ${publicId}`);
            }
        } catch (err) {
            console.error(`[CloudinaryStorageProvider] Error deleting asset at URL ${url}:`, err);
            throw err;
        }
    }

    /**
     * Downloads/retrieves the Cloudinary asset content buffer.
     */
    public async download(url: string): Promise<{ buffer: Buffer; mimeType?: string }> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download from Cloudinary: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get("content-type") || undefined;
        return { buffer, mimeType };
    }
}
