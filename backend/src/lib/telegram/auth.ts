import { client } from "./client";

export const initTelegram = async () => {
    // 1. Connect to Telegram servers
    await client.connect();

    // 2. Check if we are already authorized (logged in)
    const isAuthorized = await client.isUserAuthorized();

    if (!isAuthorized) {
        console.warn("\n⚠️ Telegram client is NOT authorized!");
        console.warn("👉 You can authenticate by connecting your account in the web application UI.\n");
    } else {
        console.log("✅ Telegram Connected (Session loaded successfully)!");
    }
};