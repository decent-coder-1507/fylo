import { downloadFileService } from "../files/files.service";
import { globalContentExtractorRegistry } from "./content-extractors/registry";
import { ContentExtractionResult } from "./content-extractors/content-extractor";

export type ExtractionOutcome =
    | { supported: true; extraction: ContentExtractionResult }
    | { supported: false; reason: string };

/** Downloads stored content only in the worker, then delegates to a format-specific extractor. */
export async function extractFileContent(fileId: string, mimeType: string | null, fileName: string): Promise<ExtractionOutcome> {
    const extractor = globalContentExtractorRegistry.getExtractor(mimeType, fileName);
    if (!extractor) {
        return { supported: false, reason: `No content extractor is registered for ${mimeType || "unknown"} (${fileName})` };
    }

    const downloaded = await downloadFileService(fileId);
    const buffer = Buffer.isBuffer(downloaded.buffer)
        ? downloaded.buffer
        : Buffer.from(downloaded.buffer as string);

    return {
        supported: true,
        extraction: await extractor.extract({ fileName, mimeType, buffer }),
    };
}
