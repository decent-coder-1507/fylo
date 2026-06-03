import { createTelegramFolderChannel, deleteTelegramFolderChannel } from "../../lib/telegram/channels"
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
    // 1. Get the folder details from the DB
    const folder = await prisma.folder.findUnique({
        where: { id },
        include: { files: true }
    });

    if (!folder) {
        throw new Error("Folder not found");
    }

    // 2. Delete the Telegram Channel
    try {
        await deleteTelegramFolderChannel(folder.telegramId.toString(), folder.accessHash || undefined);
        console.log(`Successfully deleted Telegram channel for folder: ${folder.name}`);
    } catch (err) {
        // Log error and continue deleting DB records so we don't end up with dead DB references if the channel is already deleted on Telegram manually
        console.error(`⚠️ Failed to delete Telegram channel:`, err);
    }

    // 3. Delete files inside the folder from the database (cascade deletes chunks)
    await prisma.file.deleteMany({
        where: { folderId: id }
    });

    // 4. Delete the folder record from the database
    return deleteFolderRecord(id);
};