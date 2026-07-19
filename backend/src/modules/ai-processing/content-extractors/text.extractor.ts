import path from "path";
import { ContentExtractionContext, ContentExtractionResult, ContentExtractor } from "./content-extractor";

const TEXT_EXTENSIONS = new Set([
    ".md", ".markdown", ".json", ".txt", ".csv", ".tsv", ".js", ".jsx", ".ts", ".tsx",
    ".html", ".htm", ".css", ".py", ".go", ".rs", ".java", ".cpp", ".c", ".h", ".cs",
    ".sh", ".bash", ".yaml", ".yml", ".xml", ".sql", ".ini", ".toml", ".php", ".rb",
    ".swift", ".kt", ".scala", ".gradle",
]);
const MAX_TEXT_CHARS = 100 * 1024;

export class TextContentExtractor implements ContentExtractor {
    public readonly name = "text-content";

    public canExtract(mimeType: string | null, fileName: string): boolean {
        const extension = path.extname(fileName).toLowerCase();
        const mime = (mimeType || "").toLowerCase();
        return TEXT_EXTENSIONS.has(extension) || mime.startsWith("text/") || mime === "application/json";
    }

    public async extract(context: ContentExtractionContext): Promise<ContentExtractionResult> {
        const decoded = context.buffer.toString("utf8").replace(/\r\n?/g, "\n");
        const truncated = decoded.length > MAX_TEXT_CHARS;
        const text = decoded.slice(0, MAX_TEXT_CHARS).replace(/[^\S\n]+/g, " ").trim();

        return {
            text,
            truncated,
            metadata: {
                extractor: this.name,
                encoding: "utf-8",
                originalBytes: context.buffer.length,
            },
        };
    }
}
