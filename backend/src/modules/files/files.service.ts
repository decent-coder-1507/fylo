import prisma from "../../lib/db/prisma";
import { findFiles } from "./files.repository";
import { ListFilesQuery } from "./files.types";
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

    await prisma.file.delete({
        where: { id: fileId }
    });

    return { success: true };
};