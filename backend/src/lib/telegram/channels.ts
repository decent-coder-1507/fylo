import { client } from "./client";
import { Api } from "telegram";

export const createTelegramFolderChannel = async (name: string) => {
    const result = await client.invoke(
        new Api.channels.CreateChannel({
            title: name,
            about: `TeleStore Folder: ${name}`,
            megagroup: false,
            broadcast: true
        })
    );

    const channel = (result as any).chats[0];

    if (!channel) {
        throw new Error("❌ Failed to create channel")
    }

    return {
        telegramId: channel.id,
        accessHash: channel.accessHash?.toString(),
        title: channel.title
    }
}