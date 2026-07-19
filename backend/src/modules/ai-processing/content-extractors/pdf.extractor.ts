import { ContentExtractionContext, ContentExtractionResult, ContentExtractor } from "./content-extractor";

const MAX_PAGES = 50;
const MAX_TEXT_CHARS = 100 * 1024;

export class PdfContentExtractor implements ContentExtractor {
    public readonly name = "pdf-text";

    public canExtract(mimeType: string | null, fileName: string): boolean {
        return mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
    }

    public async extract(context: ContentExtractionContext): Promise<ContentExtractionResult> {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(context.buffer) });
        const pdf = await loadingTask.promise;
        const pageLimit = Math.min(pdf.numPages, MAX_PAGES);
        const pages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            pages.push(content.items.map((item: any) => item.str || "").join(" "));
        }

        const normalized = pages.join("\n\n").replace(/\s+/g, " ").trim();
        let title: string | null = null;
        let author: string | null = null;
        try {
            const metadata = await pdf.getMetadata();
            const info = metadata.info as Record<string, unknown> | null;
            title = typeof info?.Title === "string" ? info.Title : null;
            author = typeof info?.Author === "string" ? info.Author : null;
        } catch {
            // Metadata is optional and should not make a readable PDF fail extraction.
        }
        await (loadingTask as any).destroy?.();

        return {
            text: normalized.slice(0, MAX_TEXT_CHARS),
            truncated: pdf.numPages > MAX_PAGES || normalized.length > MAX_TEXT_CHARS,
            metadata: { extractor: this.name, pageCount: pdf.numPages, extractedPages: pageLimit, title, author },
        };
    }
}
