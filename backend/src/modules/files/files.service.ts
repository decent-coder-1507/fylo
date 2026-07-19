import prisma from "../../lib/db/prisma";
import { findFiles } from "./files.repository";
import { ListFilesQuery } from "./files.types";
import { globalAiService, globalVectorStore } from "../ai";
import { Api } from "telegram";
import bigInt from "big-integer";
import { client } from "../../lib/telegram/client";


export const downloadFileService = async (fileId: string) => {
    const fileRecord = await prisma.file.findUnique({
        where: { id: fileId },
        include: { folder: true }
    });

    if (!fileRecord) {
        throw new Error("File not found in database");
    }

    let target: any = "me";
    if (fileRecord.folder) {
        const folder = fileRecord.folder;
        if (folder.accessHash) {
            target = new Api.InputPeerChannel({
                channelId: bigInt(folder.telegramId.toString()),
                accessHash: bigInt(folder.accessHash),
            });
        } else {
            target = bigInt(folder.telegramId.toString());
        }
    }

    const messages = await client.getMessages(target, {
        ids: [fileRecord.telegramMessageId],
    });

    const message = messages[0];

    if (!message || !message.media) {
        throw new Error("File media not found in Telegram");
    }

    const buffer = await client.downloadMedia(message);

    return {
        buffer,
        name: fileRecord.name,
        mimeType: fileRecord.mimeType || "application/octet-stream",
    };
};

export const listFilesService = async (query: ListFilesQuery) => {
    let resolvedQuery = { ...query };
    if (query.folderId) {
        const folder = await prisma.folder.findUnique({
            where: { id: query.folderId }
        });

        if (!folder) {
            try {
                const numericFolderId = BigInt(query.folderId);
                const folderByTg = await prisma.folder.findUnique({
                    where: { telegramId: numericFolderId }
                });
                if (folderByTg) {
                    resolvedQuery.folderId = folderByTg.id;
                }
            } catch (err) {
                // Ignore if not a valid BigInt string
            }
        }
    }
    return await findFiles(resolvedQuery);
};

export const deleteFileService = async (fileId: string) => {
    const fileRecord = await prisma.file.findUnique({
        where: { id: fileId },
        include: { folder: true, chunks: true }
    });

    if (!fileRecord) {
        throw new Error("File not found in database");
    }

    let target: any = "me";
    if (fileRecord.folder) {
        const folder = fileRecord.folder;
        if (folder.accessHash) {
            target = new Api.InputPeerChannel({
                channelId: bigInt(folder.telegramId.toString()),
                accessHash: bigInt(folder.accessHash),
            });
        } else {
            target = bigInt(folder.telegramId.toString());
        }
    }

    const messageIds = [fileRecord.telegramMessageId];
    if (fileRecord.chunks && fileRecord.chunks.length > 0) {
        for (const chunk of fileRecord.chunks) {
            messageIds.push(chunk.telegramMessageId);
        }
    }

    try {
        await client.deleteMessages(target, messageIds, { revoke: true });
        console.log(`Successfully deleted ${messageIds.length} message(s) from Telegram for file: ${fileRecord.name}`);
    } catch (err) {
        console.warn(`⚠️ Failed to delete Telegram messages:`, err);
    }

    // Clean up vector embedding in Qdrant to ensure vector database consistency
    try {
        await globalVectorStore.delete(fileId);
        console.log(`Successfully deleted vector embedding for file: ${fileId}`);
    } catch (err) {
        console.warn(`⚠️ Failed to delete vector embedding from Qdrant:`, err);
    }

    await prisma.file.delete({
        where: { id: fileId }
    });

    return { success: true };
};

export interface SearchFilesQuery {
    query: string;
    mode?: "semantic" | "keyword" | "hybrid";
    folderId?: string;
    limit?: number;
    minScore?: number;
}

export interface SearchFilesResponse {
    files: any[];
    mode: "semantic" | "keyword" | "hybrid";
    count: number;
}

export const searchFilesService = async (params: SearchFilesQuery): Promise<SearchFilesResponse> => {
    const { query, mode = "semantic", folderId, limit = 10, minScore = 0.2 } = params;

    if (!query || query.trim() === "") {
        return { files: [], mode: mode as any, count: 0 };
    }

    let semanticResults: Array<{ id: string; score: number; payload: any }> = [];

    // 1. Vector Search (Semantic)
    if (mode === "semantic" || mode === "hybrid") {
        try {
            console.log(`🔍 [SearchService] Generating query embedding for: "${query}"`);
            const embeddingResponse = await globalAiService.embed({ text: query });
            const queryVector = embeddingResponse.values;

            console.log(`🔍 [SearchService] Searching vector DB...`);
            const filter = folderId ? {
                must: [
                    {
                        key: "folderId",
                        match: { value: folderId }
                    }
                ]
            } : undefined;

            semanticResults = await globalVectorStore.search(queryVector, {
                limit: limit * 2,
                filter
            });
        } catch (err) {
            console.error("⚠️ [SearchService] Vector search failed:", err);
            if (mode === "semantic") {
                console.log("🔄 [SearchService] Falling back to keyword search due to vector error.");
                return searchFilesService({ ...params, mode: "keyword" });
            }
        }
    }

    // 2. Keyword Search
    let keywordResults: any[] = [];
    if (mode === "keyword" || mode === "hybrid") {
        const listQueryResults = await findFiles({
            search: query,
            folderId,
            limit: limit * 2,
        });
        keywordResults = listQueryResults.files;
    }

    // 3. Merging & Ranking (Supports future Hybrid search)
    let finalFilesWithScores: Array<{ file: any; score: number }> = [];

    if (mode === "semantic") {
        const fileIds = semanticResults.map(r => r.id);
        const files = await prisma.file.findMany({
            where: { id: { in: fileIds } },
            include: { folder: true, aiProcessing: true }
        });

        const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
        finalFilesWithScores = files.map(file => {
            const vectorResult = semanticResults.find(r => r.id === file.id);
            let score = vectorResult?.score ?? 0;

            if (file.name.toLowerCase() === query.toLowerCase()) {
                score += 0.20;
            } else {
                const nameLower = file.name.toLowerCase();
                let matches = 0;
                for (const term of queryTerms) {
                    if (nameLower.includes(term)) matches++;
                }
                if (matches > 0) {
                    score += 0.05 * (matches / queryTerms.length);
                }
            }

            const tagsLower = file.tags.map(t => t.toLowerCase());
            for (const term of queryTerms) {
                if (tagsLower.includes(term)) {
                    score += 0.05;
                }
            }

            return {
                file,
                score: Math.min(score, 1.0)
            };
        }).filter(r => r.score >= minScore);

        finalFilesWithScores.sort((a, b) => b.score - a.score);
    } else if (mode === "keyword") {
        finalFilesWithScores = keywordResults.map(file => ({
            file,
            score: 1.0
        }));
    } else if (mode === "hybrid") {
        const fileMap = new Map<string, { file: any; score: number }>();

        keywordResults.forEach((file, index) => {
            const keywordScore = 1 / (index + 1);
            fileMap.set(file.id, { file, score: keywordScore * 0.5 });
        });

        const semanticIds = semanticResults.map(r => r.id);
        const semanticFiles = await prisma.file.findMany({
            where: { id: { in: semanticIds } },
            include: { folder: true, aiProcessing: true }
        });

        semanticFiles.forEach(file => {
            const vectorResult = semanticResults.find(r => r.id === file.id);
            const vectorScore = vectorResult?.score ?? 0;
            
            const existing = fileMap.get(file.id);
            if (existing) {
                existing.score = existing.score + (vectorScore * 0.5);
            } else {
                fileMap.set(file.id, { file, score: vectorScore * 0.5 });
            }
        });

        finalFilesWithScores = Array.from(fileMap.values()).filter(r => r.score >= minScore);
        finalFilesWithScores.sort((a, b) => b.score - a.score);
    }

    const paginatedResults = finalFilesWithScores.slice(0, limit);

    return {
        files: paginatedResults.map(r => ({
            ...r.file,
            searchScore: r.score
        })),
        mode,
        count: paginatedResults.length
    };
};