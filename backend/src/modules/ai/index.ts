export * from "./ai.config";
export * from "./ai.types";
export * from "./ai.errors";
export * from "./ai.service";
export * from "./qdrant.client";
export * from "./providers/gemini.provider";
export * from "./ai.schemas";
export * from "../../lib/ai/prompts";
export * from "./vector-store.interface";
export * from "./providers/qdrant.provider";

import { QdrantVectorStore } from "./providers/qdrant.provider";
export const globalVectorStore = new QdrantVectorStore();
