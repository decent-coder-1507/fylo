export interface FileItem {
    id: string;
    name: string;
    size?: number;

    telegramMessageId: number;

    createdAt: string;
}