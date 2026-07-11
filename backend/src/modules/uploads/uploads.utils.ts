import fs from "fs";
import path from "path";
import prisma from "../../lib/db/prisma";
import { Api } from "telegram";
import bigInt from "big-integer";

/**
 * Resolves a folder identifier to the Telegram Peer target (InputPeerChannel or BigInt ID)
 * and retrieves the corresponding database folder record if available.
 */
export async function resolveTelegramTarget(folderId?: string): Promise<{
    target: any;
    dbFolderId: string | null;
}> {
    let target: any = "me";
    let dbFolderId: string | null = null;

    if (folderId) {
        let folder = await prisma.folder.findUnique({
            where: { id: folderId },
        });

        if (!folder) {
            try {
                const numericFolderId = BigInt(folderId);
                folder = await prisma.folder.findUnique({
                    where: { telegramId: numericFolderId },
                });
            } catch (err) {
                // Ignore if not a valid BigInt string
            }
        }

        if (folder) {
            dbFolderId = folder.id;
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

    return { target, dbFolderId };
}

/**
 * Cleans up the temporary local file on disk and its containing directory (if generated under uploads).
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            
            const parentDir = path.dirname(filePath);
            const uploadsBaseDir = path.join(process.cwd(), "uploads");
            
            // Only clean up the subdirectory if it's not the base uploads directory itself
            if (parentDir.includes("uploads") && parentDir !== uploadsBaseDir) {
                // Read directory contents to ensure it is empty before removing
                const files = await fs.promises.readdir(parentDir);
                if (files.length === 0) {
                    await fs.promises.rmdir(parentDir);
                }
            }
        }
    } catch (cleanupErr) {
        console.error("⚠️ Failed to clean up local uploaded file:", cleanupErr);
    }
}
