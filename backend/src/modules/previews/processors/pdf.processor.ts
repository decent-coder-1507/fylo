import fs from "fs";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { PreviewProcessor } from "../previews.processor";
import { PreviewContext, PreviewResult } from "../previews.types";

/**
 * Preview processor specialized in handling PDF documents.
 * Extracts page count and metadata, and generates a first-page preview and thumbnail.
 */
export class PDFPreviewProcessor implements PreviewProcessor {
    readonly name = "pdf-processor";

    /**
     * Determines if this processor can handle the given file.
     * Evaluates MIME type and file extension.
     */
    public canProcess(mimeType: string, fileName: string): boolean {
        const ext = path.extname(fileName).toLowerCase();
        return (
            (mimeType && mimeType.toLowerCase() === "application/pdf") ||
            ext === ".pdf"
        );
    }

    /**
     * Processes the PDF document to extract properties and render its first page as preview assets.
     */
    public async process(context: PreviewContext): Promise<PreviewResult> {
        const { localPath } = context;

        // Verify local file exists
        if (!fs.existsSync(localPath)) {
            throw new Error(`File not found at local path: ${localPath}`);
        }

        try {
            // Import pdfjs-dist legacy load dynamically for ES Module loading compatibility
            const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

            // Read PDF into memory buffer
            const data = new Uint8Array(await fs.promises.readFile(localPath));

            // Load the document (workerless configuration using legacy entrypoint)
            const loadingTask = pdfjs.getDocument({
                data,
                // Performance optimizations: disable range requests and stream requests since file is local
                disableRange: true,
                disableStream: true,
                disableFontFace: false, // Keep font rendering support for accurate previews
                stopAtErrors: false,
            });

            const pdf = await loadingTask.promise;
            const pageCount = pdf.numPages;

            if (pageCount === 0) {
                throw new Error("PDF file has 0 pages.");
            }

            // Attempt to retrieve document metadata (e.g. Title, Author, Creator)
            let title = "";
            let author = "";
            let creator = "";
            try {
                const meta = await pdf.getMetadata();
                if (meta && meta.info) {
                    const info = meta.info as Record<string, any>;
                    title = info.Title || "";
                    author = info.Author || "";
                    creator = info.Creator || "";
                }
            } catch (metaErr) {
                console.warn("[PDFPreviewProcessor] Failed to extract document metadata:", metaErr);
            }

            // Load and render page 1 at 1.5x scale for a high-quality rendering base
            const page = await pdf.getPage(1);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            // Create canvas and draw the PDF page context
            const canvas = createCanvas(viewport.width, viewport.height);
            const ctx = canvas.getContext("2d");

            await page.render({
                canvasContext: ctx,
                viewport: viewport
            } as any).promise;

            // Encode the rendered canvas as a raw PNG buffer
            const rawPageBuffer = await canvas.encode("png");

            // Generate thumbnail: resize to fit inside 200x200
            const thumbnailBuffer = await sharp(rawPageBuffer)
                .resize({
                    width: 200,
                    height: 200,
                    fit: "inside",
                    withoutEnlargement: true
                })
                .jpeg({ quality: 80 })
                .toBuffer();

            // Generate preview: resize to fit inside 1200x1200
            const previewBuffer = await sharp(rawPageBuffer)
                .resize({
                    width: 1200,
                    height: 1200,
                    fit: "inside",
                    withoutEnlargement: true
                })
                .jpeg({ quality: 85 })
                .toBuffer();

            // Construct metadata object for JSON DB field
            const previewMetadata = {
                pageCount,
                width: Math.round(viewport.width / scale),
                height: Math.round(viewport.height / scale),
                title: title || undefined,
                author: author || undefined,
                creator: creator || undefined,
            };

            return {
                thumbnail: {
                    buffer: thumbnailBuffer,
                    mimeType: "image/jpeg"
                },
                preview: {
                    buffer: previewBuffer,
                    mimeType: "image/jpeg"
                },
                metadata: previewMetadata
            };

        } catch (err: any) {
            if (err.name === "PasswordException") {
                throw new Error("Failed to process PDF: File is password protected.");
            }
            throw new Error(`Failed to process PDF: ${err.message || err}`);
        }
    }
}
