import { Prisma } from "@prisma/client";

export interface AiProcessingInput {
    file: {
        id: string;
        name: string;
        mimeType: string | null;
        size: number | null;
        checksum: string | null;
        projectName: string | null;
        projectVersion: string | null;
        tags: string[];
    };
    content: {
        text: string;
        metadata: Record<string, unknown>;
        truncated: boolean;
    };
}

export interface AiProcessingOutput {
    summary?: string;
    suggestedTags?: string[];
    result?: Prisma.InputJsonValue;
}

/** Contract for future AI tasks/providers (classification, embeddings, OCR, and so on). */
export interface AiProcessor {
    process(input: AiProcessingInput): Promise<AiProcessingOutput>;
}

/** Default provider adapter. It intentionally sends metadata only, never upload temp files. */
export class HttpAiProcessor implements AiProcessor {
    constructor(private readonly endpoint: string, private readonly apiKey?: string) {}

    public async process(input: AiProcessingInput): Promise<AiProcessingOutput> {
        const response = await fetch(this.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
            },
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            throw new Error(`AI processor returned HTTP ${response.status}`);
        }

        return await response.json() as AiProcessingOutput;
    }
}
