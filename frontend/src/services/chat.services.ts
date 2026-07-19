import { api } from "@/app/lib/axios";

export interface ChatMessage {
    role: "user" | "model" | "system";
    text: string;
}

export interface ChatResponse {
    answer: string;
    confidence: "high" | "medium" | "low" | "none";
    citations: Array<{
        fileId: string;
        fileName: string;
        snippet: string;
    }>;
}

export const sendChatMessage = async (
    query: string,
    folderId?: string,
    limit?: number,
    history?: ChatMessage[],
    fileId?: string
): Promise<ChatResponse> => {
    const res = await api.post("/chat", {
        query,
        folderId,
        limit,
        history,
        fileId,
    });
    return res.data;
};
