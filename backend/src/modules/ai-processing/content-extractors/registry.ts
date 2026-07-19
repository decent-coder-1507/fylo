import { ContentExtractor } from "./content-extractor";
import { ImageContentExtractor } from "./image.extractor";
import { PdfContentExtractor } from "./pdf.extractor";
import { TextContentExtractor } from "./text.extractor";

export class ContentExtractorRegistry {
    constructor(private readonly extractors: ContentExtractor[]) {}

    public getExtractor(mimeType: string | null, fileName: string): ContentExtractor | undefined {
        return this.extractors.find((extractor) => extractor.canExtract(mimeType, fileName));
    }
}

export const globalContentExtractorRegistry = new ContentExtractorRegistry([
    new PdfContentExtractor(),
    new ImageContentExtractor(),
    new TextContentExtractor(),
]);
