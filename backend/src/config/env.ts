import dotenv from "dotenv";

dotenv.config();

export const env = {
    port: process.env.PORT || 5000,
    apiId: Number(process.env.API_ID),
    apiHash: process.env.API_HASH!,
    phone: process.env.PHONE!,
    telegramProxyMode: (process.env.TELEGRAM_PROXY_MODE || "auto") as "direct" | "proxy" | "auto",
    telegramProxies: process.env.TELEGRAM_PROXIES || "",
    telegramFetchPublicProxies: process.env.TELEGRAM_FETCH_PUBLIC_PROXIES !== "false"
}