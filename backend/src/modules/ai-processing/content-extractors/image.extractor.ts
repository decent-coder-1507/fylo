import sharp from "sharp";
import { ContentExtractionContext, ContentExtractionResult, ContentExtractor } from "./content-extractor";

export class ImageContentExtractor implements ContentExtractor {
    public readonly name = "image-metadata";

    public canExtract(mimeType: string | null, fileName: string): boolean {
        return (mimeType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|tiff?|bmp|avif)$/i.test(fileName);
    }

    public async extract(context: ContentExtractionContext): Promise<ContentExtractionResult> {
        const metadata = await sharp(context.buffer, { animated: true }).metadata();
        return {
            // OCR is intentionally a separate future extractor; this stage normalizes available image metadata.
            text: "",
            truncated: false,
            metadata: {
                extractor: this.name,
                format: metadata.format || null,
                width: metadata.width || null,
                height: metadata.height || null,
                pages: metadata.pages || 1,
                space: metadata.space || null,
                hasAlpha: metadata.hasAlpha || false,
                orientation: metadata.orientation || null,
            },
        };
    }
}
