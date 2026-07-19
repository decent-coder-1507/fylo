import { getQdrantClient } from "./ai.config";

// Retrieve initialized singleton client
export const qdrantClient = getQdrantClient();

/**
 * Ensures a Qdrant collection exists, creating it with the specified vector dimensions if not.
 * Default vector size is 768 to match gemini-embedding-2 output dimensions.
 */
export async function ensureQdrantCollection(
    collectionName: string,
    vectorSize: number = 3072,
    distanceMetric: "Cosine" | "Euclid" | "Dot" = "Cosine"
): Promise<void> {
    try {
        const result = await qdrantClient.getCollections();
        const exists = result.collections.some((c) => c.name === collectionName);

        if (!exists) {
            console.log(`📡 [Qdrant] Collection "${collectionName}" does not exist. Creating collection...`);
            await qdrantClient.createCollection(collectionName, {
                vectors: {
                    size: vectorSize,
                    distance: distanceMetric,
                },
            });
            console.log(`✅ [Qdrant] Collection "${collectionName}" initialized successfully.`);
        } else {
            console.log(`ℹ️ [Qdrant] Collection "${collectionName}" already exists.`);
        }
    } catch (error) {
        console.error(`❌ [Qdrant] Failed to verify or create collection "${collectionName}":`, error);
        throw error;
    }
}
