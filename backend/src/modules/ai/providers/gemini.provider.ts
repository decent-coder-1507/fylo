import { GoogleGenAI } from "@google/genai";
import { modelRegistry, getGeminiClient, ModelType } from "../ai.config";
import {
    AiProvider,
    GenerateTextOptions,
    StructuredOutputOptions,
    EmbeddingOptions,
    AiResponse,
    StructuredResponse,
    EmbeddingResponse,
} from "../ai.types";

export class GeminiProvider implements AiProvider {
    public readonly name = "google-gemini";

    private getClient(): GoogleGenAI {
        return getGeminiClient();
    }

    public async generateText(
        modelType: ModelType,
        options: GenerateTextOptions
    ): Promise<AiResponse> {
        const client = this.getClient();
        const model = modelRegistry.getModel(modelType);

        const response = await client.models.generateContent({
            model,
            contents: options.prompt,
            config: {
                systemInstruction: options.systemInstruction,
                temperature: options.temperature,
                maxOutputTokens: options.maxOutputTokens,
            },
        });

        return {
            text: response.text || "",
            usage: response.usageMetadata ? {
                promptTokens: response.usageMetadata.promptTokenCount || 0,
                candidatesTokens: response.usageMetadata.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata.totalTokenCount || 0,
            } : undefined,
        };
    }

    public async generateStructured<T>(
        modelType: ModelType,
        options: StructuredOutputOptions
    ): Promise<StructuredResponse<T>> {
        const client = this.getClient();
        const model = modelRegistry.getModel(modelType);

        const response = await client.models.generateContent({
            model,
            contents: options.prompt,
            config: {
                systemInstruction: options.systemInstruction,
                temperature: options.temperature,
                responseMimeType: "application/json",
                responseSchema: options.responseSchema,
            },
        });

        const text = response.text || "{}";
        let data: T;
        try {
            data = JSON.parse(text) as T;
        } catch (parseError: any) {
            throw new Error(`Failed to parse structured output: ${text}. Parse error: ${parseError.message}`);
        }

        return {
            data,
            usage: response.usageMetadata ? {
                promptTokens: response.usageMetadata.promptTokenCount || 0,
                candidatesTokens: response.usageMetadata.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata.totalTokenCount || 0,
            } : undefined,
        };
    }

    public async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
        const client = this.getClient();
        const model = modelRegistry.getModel("embedding");

        const response = await client.models.embedContent({
            model,
            contents: options.text,
        });

        if (!response.embeddings) {
            throw new Error("No embedding returned from provider.");
        }

        const embedding = Array.isArray(response.embeddings)
            ? response.embeddings[0]
            : response.embeddings;

        if (!embedding || !embedding.values) {
            throw new Error("No embedding values returned from provider.");
        }

        return {
            values: embedding.values,
        };
    }
}
