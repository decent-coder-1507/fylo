import prisma from "../../lib/db/prisma";
import { 
    globalAiService, 
    globalVectorStore, 
    chatResponseSchema, 
    CHAT_INSTRUCTION, 
    ChatResponseOutput 
} from "../ai";
import { ChatRequest } from "./chat.types";

export const chatService = async (params: ChatRequest): Promise<ChatResponseOutput> => {
    const { query, folderId, fileId, limit = 5 } = params;

    if (!query || query.trim() === "") {
        return {
            answer: "Please ask a question to start the conversation.",
            confidence: "none",
            citations: []
        };
    }

    // 1. Generate Query Embedding
    console.log(`💬 [ChatService] Embedding user query: "${query}"`);
    const embeddingResponse = await globalAiService.embed({ text: query });
    const queryVector = embeddingResponse.values;

    // 2. Retrieve context documents from Qdrant Vector DB
    console.log(`💬 [ChatService] Fetching matching vectors from Qdrant...`);
    const filter = fileId ? {
        must: [
            {
                key: "fileId",
                match: { value: fileId }
            }
        ]
    } : folderId ? {
        must: [
            {
                key: "folderId",
                match: { value: folderId }
            }
        ]
    } : undefined;

    const vectorResults = await globalVectorStore.search(queryVector, {
        limit,
        filter
    });

    const fileIds = vectorResults.map(r => r.id);

    if (fileIds.length === 0) {
        console.warn(`💬 [ChatService] No matching vectors found in Qdrant.`);
        return {
            answer: "I could not find any relevant information in the uploaded files.",
            confidence: "none",
            citations: []
        };
    }

    // 3. Fetch file records and their extracted text from Prisma
    console.log(`💬 [ChatService] Retrieving file contents from DB for ${fileIds.length} candidate(s)...`);
    const files = await prisma.file.findMany({
        where: {
            id: { in: fileIds }
        },
        include: {
            aiProcessing: true
        }
    });

    // 4. Build Context
    let contextParts: string[] = [];
    files.forEach((file, index) => {
        const textContent = file.aiProcessing?.extractedText || file.name;
        contextParts.push(
            `Document [${index + 1}]:\n` +
            `- File ID: ${file.id}\n` +
            `- File Name: ${file.name}\n` +
            `- Tags: ${file.tags.join(", ") || "None"}\n` +
            `- Content Snippet:\n"""\n` +
            `${textContent}\n` +
            `"""`
        );
    });
    const context = contextParts.join("\n\n");

    // 5. Construct Grounded Prompt and Instructions
    const systemInstruction = 
        CHAT_INSTRUCTION + "\n\n" +
        "CRITICAL RULES:\n" +
        "1. Answer the user's query utilizing ONLY the context documents provided below.\n" +
        "2. Do not hallucinate or use any pre-trained world knowledge. If you cannot find the answer explicitly inside the provided context documents, set the confidence to 'none' and return the exact answer: 'I could not find the relevant information in the uploaded files.'\n" +
        "3. Provide direct and factual answers. Limit citations strictly to files that are referenced in your answer.\n" +
        "4. Your output MUST be valid JSON matching the specified Response Schema.";

    const prompt = 
        `USER QUERY:\n` +
        `<user_query>\n` +
        `${query}\n` +
        `</user_query>\n\n` +
        `CONTEXT DOCUMENTS:\n` +
        `${context || "No context documents are available."}\n\n` +
        `Generate a grounded response mapping to the schema.`;

    // 6. Generate answer using Gemini 2.5 Pro (Model registry: pro)
    console.log(`💬 [ChatService] Requesting grounded answer from Gemini 2.5 Pro...`);
    try {
        const result = await globalAiService.generateStructured<ChatResponseOutput>(
            "pro", // Uses Gemini 2.5 Pro!
            {
                prompt,
                responseSchema: chatResponseSchema,
                systemInstruction,
                temperature: 0.1 // Low temperature for high factual accuracy
            }
        );
        return result.data;
    } catch (err: any) {
        console.warn(`⚠️ [ChatService] Gemini 2.5 Pro failed/rate-limited. Falling back to Gemini 2.5 Flash...`);
        const result = await globalAiService.generateStructured<ChatResponseOutput>(
            "flash", // Uses Gemini 2.5 Flash as fallback!
            {
                prompt,
                responseSchema: chatResponseSchema,
                systemInstruction,
                temperature: 0.1
            }
        );
        return result.data;
    }
};
