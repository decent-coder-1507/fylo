import prisma from "../../lib/db/prisma";
import { uploadFileToTeleStore } from "../../lib/telegram/upload";
import { findFiles } from "./files.repository";
import { ListFilesQuery } from "./files.types";
import { Api } from "telegram";
import bigInt from "big-integer";
import fs from "fs";
import path from "path";

// instead of folder id we using InputPeerChannel
export const uploadFileService = async (filePath: string, folderId?: string) => {
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
    const fileName = path.basename(filePath);
    console.log(`Telegram returned: `, `\n Message id: ${telegramResponse.messageId} `, `\n File name: ${fileName}`);

    const stats = fs.statSync(filePath);

    // Save metadata in database
    const savedFile = await prisma.file.create({
        data: {
            name: fileName || "unnamed",
            telegramMessageId: telegramResponse.messageId,
            size: stats.size,
            folderId: folder?.id || null,
        }
    });

    console.log(`Saved file in database with ID: ${savedFile.id}`);

    return savedFile;
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