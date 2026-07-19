export interface VectorPayload {
    fileId: string;
    fileName: string;
    mimeType: string;
    folderId?: string | null;
}

export interface SearchOptions {
    limit?: number;
    filter?: any; // Allows custom metadata filters
}

export interface VectorStore {
    upsert(id: string, vector: number[], payload: VectorPayload): Promise<void>;
    search(vector: number[], options?: SearchOptions): Promise<Array<{ id: string; score: number; payload: VectorPayload }>>;
    delete(id: string): Promise<void>;
}
