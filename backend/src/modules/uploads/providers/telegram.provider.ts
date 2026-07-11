import { IUploadStorageProvider } from "../uploads.types";
import { uploadFileToTeleStore } from "../../../lib/telegram/upload";

/**
 * Concrete storage provider implementation for Telegram (TeleStore).
 */
export class TelegramUploadProvider implements IUploadStorageProvider {
    public readonly name = "telegram";

    /**
     * Uploads the file to Telegram using the existing client helper.
     */
    public async upload(
        target: any,
        filePath: string,
        options?: { originalName: string; mimeType?: string }
    ): Promise<{ telegramMessageId: number }> {
        const result = await uploadFileToTeleStore(target, filePath);
        
        return {
            telegramMessageId: result.messageId,
        };
    }
}
