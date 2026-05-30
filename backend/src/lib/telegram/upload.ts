import { client } from "./client";
import fs from "fs";

export const uploadFileToTeleStore = async (target: any, filePath: string) => {
    const result = await client.sendFile(target, {  //me => root folder
        file: filePath,
        caption: "Uploaded via TeleStore",
    });

    return {
        messageId: result.id,
        // fileName: filePath.split("/").pop(),
    };
};