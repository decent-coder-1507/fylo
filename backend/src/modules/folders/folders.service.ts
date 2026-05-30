import { createTelegramFolderChannel } from "../../lib/telegram/channels"
import { createFolderRecord, findFolders, findFolderById, deleteFolderRecord } from "./folders.repository"
import prisma from "../../lib/db/prisma"

export const createFolderService = async (name: string) => {
    // 1. Verify DB is online and responsive first to prevent orphaned Telegram channels
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
        console.error("❌ Database health check failed. Aborting folder creation to prevent orphaned Telegram channels.");
        throw new Error("Database is currently unavailable. Please try again in a moment.");
    }

    // 2. create tg channel
    const tgChannel = await createTelegramFolderChannel(name);

    // 3. save in db
    const folder = await createFolderRecord({
        name,
        telegramId: BigInt(tgChannel.telegramId),
        accessHash: tgChannel.accessHash
    })

    return folder;
}

export const listFoldersService = async () => {
    return findFolders();
}

export const getFolderByIdService = async (id: string) => {
    return findFolderById(id);
}

export const deleteFolderService = async (id: string) => {
    return deleteFolderRecord(id);
}