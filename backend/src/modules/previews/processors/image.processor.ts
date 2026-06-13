import fs from "fs";
import path from "path";
import sharp from "sharp";
import { PreviewProcessor } from "../previews.processor";
import { PreviewContext, PreviewResult } from "../previews.types";

/**
 * Preview processor specialized in handling image files.
 * Generates thumbnails, extracts dimensions, and transcodes non-web-friendly formats to JPEG.
 */
export class ImagePreviewProcessor implements PreviewProcessor {
    readonly name = "image-processor";

    /**
     * Determines if this processor can handle the given file.
     * Evaluates both MIME type and file extension.
     */
    public canProcess(mimeType: string, fileName: string): boolean {
        const imageExtensions = [
            ".jpg", ".jpeg", ".png", ".webp", ".gif", 
            ".bmp", ".tiff", ".heic", ".heif", ".avif"
        ];
        const ext = path.extname(fileName).toLowerCase();

        return (
            (mimeType && mimeType.toLowerCase().startsWith("image/")) ||
            imageExtensions.includes(ext)
        );
    }

    /**
     * Processes the image file to extract dimensions, generate a thumbnail,
     * and optionally provide a web-friendly preview if the source is not directly renderable.
     */
    public async process(context: PreviewContext): Promise<PreviewResult> {
        const { localPath } = context;

        // Verify local file exists
        if (!fs.existsSync(localPath)) {
            throw new Error(`File not found at local path: ${localPath}`);
        }

        try {
            // Load file into sharp
            const image = sharp(localPath);

            // Extract metadata (dimensions, format, alpha channel, color space)
            const metadata = await image.metadata();
            const width = metadata.width;
            const height = metadata.height;
            const format = metadata.format;

            if (!width || !height) {
                throw new Error("Unable to extract dimensions (width/height) from image file.");
            }

            // Generate thumbnail: max width/height 200px, keeping aspect ratio
            const thumbnailBuffer = await image
                .clone()
                .resize({
                    width: 200,
                    height: 200,
                    fit: "inside",
                    withoutEnlargement: true
                })
                .jpeg({ quality: 80 })
                .toBuffer();

            // Construct preview metadata object for DB storage
            const previewMetadata = {
                width,
                height,
                format: format || "unknown",
                aspectRatio: width / height,
                hasAlpha: !!metadata.hasAlpha,
                space: metadata.space || "srgb",
            };

            const result: PreviewResult = {
                thumbnail: {
                    buffer: thumbnailBuffer,
                    mimeType: "image/jpeg"
                },
                metadata: previewMetadata
            };

            // Detect web-friendly formats to avoid redundant preview transcode storage.
            // If the format is not directly web-friendly (e.g. tiff, heic, bmp),
            // transcode it to a web-friendly JPEG format for full preview view.
            const webFriendlyFormats = ["jpeg", "jpg", "png", "webp", "gif", "svg", "avif"];
            const isWebFriendly = format && webFriendlyFormats.includes(format.toLowerCase());

            if (!isWebFriendly) {
                // Generate a web-friendly preview: max width/height 1200px, keeping aspect ratio
                const previewBuffer = await image
                    .clone()
                    .resize({
                        width: 1200,
                        height: 1200,
                        fit: "inside",
                        withoutEnlargement: true
                    })
                    .jpeg({ quality: 85 })
                    .toBuffer();

                result.preview = {
                    buffer: previewBuffer,
                    mimeType: "image/jpeg"
                };
            }

            return result;

        } catch (err: any) {
            throw new Error(`Failed to process image: ${err.message || err}`);
        }
    }
}
