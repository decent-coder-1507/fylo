import { VectorStore, VectorPayload } from "../vector-store.interface";
import { qdrantClient, ensureQdrantCollection } from "../qdrant.client";

export class QdrantVectorStore implements VectorStore {
    private collectionName = "file_embeddings";
    private initialized = false;

    private async init(): Promise<void> {
        if (this.initialized) return;
        // Default gemini-embedding-2 generates 3072-dimension vectors
        await ensureQdrantCollection(this.collectionName, 3072);
        this.initialized = true;
    }

    public async upsert(id: string, vector: number[], payload: VectorPayload): Promise<void> {
        await this.init();
        await qdrantClient.upsert(this.collectionName, {
            wait: true,
            points: [
                {
                    id,
                    vector,
                    payload: payload as any,
                },
            ],
        });
    }

    public async search(
        vector: number[],
        options?: { limit?: number; filter?: any }
    ): Promise<Array<{ id: string; score: number; payload: VectorPayload }>> {
        await this.init();
        const results = await qdrantClient.search(this.collectionName, {
            vector,
            limit: options?.limit ?? 5,
            filter: options?.filter,
            with_payload: true,
        });

        return results.map((r) => ({
            id: String(r.id),
            score: r.score,
            payload: r.payload as unknown as VectorPayload,
        }));
    }

    public async delete(id: string): Promise<void> {
        await this.init();
        await qdrantClient.delete(this.collectionName, {
            points: [id],
        });
    }
}
