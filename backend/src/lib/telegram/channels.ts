import { client } from "./client";
import { Api } from "telegram";
import bigInt from "big-integer";

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

export const deleteTelegramFolderChannel = async (telegramId: string, accessHash?: string) => {
    let channel: any;
    if (accessHash) {
        channel = new Api.InputChannel({
            channelId: bigInt(telegramId),
            accessHash: bigInt(accessHash),
        });
    } else {
        channel = bigInt(telegramId);
    }

    await client.invoke(
        new Api.channels.DeleteChannel({
            channel,
        })
    );
};