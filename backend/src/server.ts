import app from "./app"
import { env } from "./config/env"
import { initTelegram } from "./lib/telegram/auth"
import prisma from "./lib/db/prisma"


const start = async () => {
    console.log("🔄 Waking up serverless database...");
    try {
        await prisma.$connect();
        console.log("✅ Database connected successfully!");
    } catch (err) {
        console.error("⚠️ Database connection check failed on startup. It might still be waking up:", err);
    }

    await initTelegram();

    app.listen(env.port, async () => {
        console.log(`🚀 Server running on port ${env.port}`);
    })
}

start();