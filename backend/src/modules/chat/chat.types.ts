export interface ChatMessage {
    role: "user" | "model" | "system";
    text: string;
}

export interface ChatRequest {
    query: string;
    history?: ChatMessage[];
    folderId?: string;
    limit?: number;
}
