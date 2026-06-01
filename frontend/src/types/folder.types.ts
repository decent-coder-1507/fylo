export interface Folder {
    id: string;
    name: string;
    telegramId: string;
    createdAt: string;

    _count?: {
        files: number
    }
}