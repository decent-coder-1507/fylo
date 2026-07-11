import fs from "fs";
import prisma from "../../lib/db/prisma";
import { UploadPayload } from "./uploads.types";

/**
 * Validates the upload request payload, including checking for file existence
 * and folder existence in the database.
 */
export async function validateUploadPayload(payload: UploadPayload): Promise<void> {
    const { filePath, originalName, size, folderId } = payload;

    // 1. Validate file path and existence
    if (!filePath) {
        throw new Error("Temporary file path is required");
    }
    if (!fs.existsSync(filePath)) {
        throw new Error(`Temporary file not found on disk: ${filePath}`);
    }

    // 2. Validate original name
    if (!originalName || originalName.trim() === "") {
        throw new Error("File name is required");
    }

    // 3. Validate size
    if (size === undefined || size < 0) {
        throw new Error("Invalid file size");
    }

    // 4. Validate folder if folderId is provided
    if (folderId) {
        let folder = await prisma.folder.findUnique({
            where: { id: folderId },
        });

        if (!folder) {
            // Check if folderId is a Telegram ID string
            try {
                const numericFolderId = BigInt(folderId);
                folder = await prisma.folder.findUnique({
                    where: { telegramId: numericFolderId },
                });
            } catch (err) {
                // Ignore if not a valid BigInt string
            }
        }

        if (!folder) {
            throw new Error(`Target folder not found: ${folderId}`);
        }
    }
}
