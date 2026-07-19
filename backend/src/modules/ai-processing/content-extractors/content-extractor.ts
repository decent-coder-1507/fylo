export interface ContentExtractionContext {
    fileName: string;
    mimeType: string | null;
    buffer: Buffer;
}

export interface ContentExtractionResult {
    text: string;
    metadata: Record<string, unknown>;
    truncated: boolean;
}

/** Each content type owns its extraction rules, making new formats additive. */
export interface ContentExtractor {
    readonly name: string;
    canExtract(mimeType: string | null, fileName: string): boolean;
    extract(context: ContentExtractionContext): Promise<ContentExtractionResult>;
}
