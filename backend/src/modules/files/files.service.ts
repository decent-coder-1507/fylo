import prisma from "../../lib/db/prisma";
import { uploadFileToTeleStore } from "../../lib/telegram/upload";
import { findFiles } from "./files.repository";
import { ListFilesQuery } from "./files.types";
import { Api } from "telegram";
import bigInt from "big-integer";
import fs from "fs";
import path from "path";
import { client } from "../../lib/telegram/client";

// instead of folder id we using InputPeerChannel
export const uploadFileService = async (filePath: string, originalName: string, mimeType?: string, folderId?: string) => {
    let target: any = "me";
    let folder = null;

    if (folderId) {
        folder = await prisma.folder.findUnique({
            where: { id: folderId }
        });

        if (!folder) {
            try {
                const numericFolderId = BigInt(folderId);
                folder = await prisma.folder.findUnique({
                    where: { telegramId: numericFolderId }
                });
            } catch (err) {
                // Ignore if not a valid BigInt string
            }
        }

        if (folder) {
            if (folder.accessHash) {
                target = new Api.InputPeerChannel({
                    channelId: bigInt(folder.telegramId.toString()),
                    accessHash: bigInt(folder.accessHash),
                });
            } else {
                target = bigInt(folder.telegramId.toString());
            }
        }
    }

    const telegramResponse = await uploadFileToTeleStore(target, filePath);
    console.log(`Telegram returned: `, `\n Message id: ${telegramResponse.messageId} `, `\n File name: ${originalName}`);

    const stats = fs.statSync(filePath);

    // Save metadata in database
    const savedFile = await prisma.file.create({
        data: {
            name: originalName || "unnamed",
            mimeType: mimeType || null,
            telegramMessageId: telegramResponse.messageId,
            size: stats.size,
            folderId: folder?.id || null,
        }
    });

    console.log(`Saved file in database with ID: ${savedFile.id}`);

    // Cleanup local temp file and directory after upload
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            const parentDir = path.dirname(filePath);
            if (parentDir.includes("uploads")) {
                fs.rmdirSync(parentDir);
            }
        }
    } catch (cleanupErr) {
        console.error("⚠️ Failed to clean up local uploaded file:", cleanupErr);
    }

    return savedFile;
};

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