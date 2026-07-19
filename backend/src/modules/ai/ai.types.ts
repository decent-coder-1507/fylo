import { ModelType } from "./ai.config";

export interface GenerateTextOptions {
    prompt: string;
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    timeoutMs?: number;
}

export interface StructuredOutputOptions {
    prompt: string;
    responseSchema: Record<string, any>; // Standard JSON Schema representation
    systemInstruction?: string;
    temperature?: number;
    timeoutMs?: number;
}

export interface EmbeddingOptions {
    text: string;
}

export interface AiResponse {
    text: string;
    usage?: {
        promptTokens: number;
        candidatesTokens: number;
        totalTokens: number;
    };
}

export interface StructuredResponse<T> {
    data: T;
    usage?: {
        promptTokens: number;
        candidatesTokens: number;
        totalTokens: number;
    };
}

export interface EmbeddingResponse {
    values: number[];
}

export interface AiProvider {
    readonly name: string;
    generateText(modelType: ModelType, options: GenerateTextOptions): Promise<AiResponse>;
    generateStructured<T>(modelType: ModelType, options: StructuredOutputOptions): Promise<StructuredResponse<T>>;
    embed(options: EmbeddingOptions): Promise<EmbeddingResponse>;
}
