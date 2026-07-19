import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

export const aiConfig = {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    flashModel: process.env.GEMINI_FLASH_MODEL || "gemini-2.5-flash",
    proModel: process.env.GEMINI_PRO_MODEL || "gemini-2.5-pro",
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
    qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
    qdrantApiKey: process.env.QDRANT_API_KEY || "",
};

// Log warning if API key is missing
if (!aiConfig.geminiApiKey) {
    console.warn("⚠️ [AI Config] GEMINI_API_KEY is not defined. GenAI calls will fail.");
}

// 1. Centralized Gemini client initialization
let geminiClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
    if (!geminiClient) {
        geminiClient = new GoogleGenAI({ apiKey: aiConfig.geminiApiKey });
    }
    return geminiClient;
}

// 2. Centralized Qdrant client initialization
let qdrantClient: QdrantClient | null = null;
export function getQdrantClient(): QdrantClient {
    if (!qdrantClient) {
        qdrantClient = new QdrantClient({
            url: aiConfig.qdrantUrl,
            ...(aiConfig.qdrantApiKey ? { apiKey: aiConfig.qdrantApiKey } : {}),
        });
    }
    return qdrantClient;
}

// 3. Centralized Model Registry
export type ModelType = "flash" | "pro" | "embedding";

export const modelRegistry = {
    models: {
        flash: aiConfig.flashModel,
        pro: aiConfig.proModel,
        embedding: aiConfig.embeddingModel,
    },
    getModel(type: ModelType): string {
        return this.models[type];
    }
};
