import amqp from "amqplib";
import prisma from "../../lib/db/prisma";
import { initTelegram } from "../../lib/telegram/auth";
import { client as tgClient } from "../../lib/telegram/client";
import { PreviewQueueClient, QUEUE_CONFIG } from "./preview.queue";
import { globalPreviewManager } from "./preview.manager";

const queueClient = new PreviewQueueClient();

let isShuttingDown = false;
let consumerTag: string | null = null;
let activeJobsCount = 0;

/**
 * Initializes connections and starts consuming tasks from the previews queue.
 */
async function startWorker() {
    console.log("⚡ Starting Preview Background Worker...");

    // 1. Establish database connection
    try {
        await prisma.$connect();
        console.log("✅ Database connected successfully.");
    } catch (err) {
        console.error("❌ Database connection check failed:", err);
        process.exit(1);
    }

    // 2. Initialize Telegram connection
    try {
        await initTelegram();
    } catch (err) {
        console.warn("⚠️ Telegram client initialization failed on startup. Worker will continue and connection monitor will auto-heal:", err);
    }

    // 3. Connect to RabbitMQ
    let channel: amqp.Channel;
    try {
        channel = await queueClient.connect();
    } catch (err) {
        console.error("❌ RabbitMQ connection failed:", err);
        process.exit(1);
    }

    // prefetch 1 to distribute tasks evenly across multiple worker processes
    await channel.prefetch(1);

    console.log(`📥 Waiting for messages in queue: ${QUEUE_CONFIG.queue}`);

    const consumeResult = await channel.consume(QUEUE_CONFIG.queue, async (msg) => {
        if (!msg) {
            console.log("[Worker] Consumer was cancelled by server.");
            return;
        }

        if (isShuttingDown) {
            // Requeue the message so another worker can process it
            channel.nack(msg, false, true);
            return;
        }

        activeJobsCount++;
        let fileId = "";

        try {
            const payload = JSON.parse(msg.content.toString());
            fileId = payload.fileId;
            console.log(`[Worker] Received job for file ID: ${fileId}`);

            // Verify Telegram client authorization state
            const isAuthorized = await tgClient.isUserAuthorized();
            if (!isAuthorized) {
                console.warn("[Worker] Telegram client is not authorized. Requeuing job.");
                await new Promise((resolve) => setTimeout(resolve, 5000));
                channel.nack(msg, false, true);
                return;
            }

            // Run the preview processor logic
            await globalPreviewManager.processFilePreview(fileId);

            // Acknowledge the message. Handled pipeline failures (such as unsupported files or skipped previews)
            // are tracked internally in the database, so the RabbitMQ message is safely acknowledged.
            channel.ack(msg);
            console.log(`[Worker] Job acknowledged for file: ${fileId}`);
        } catch (error) {
            console.error(`[Worker] Error processing message payload:`, error);

            if (!fileId) {
                // Reject malformed JSON messages without requeuing to send them directly to the DLQ
                console.error("[Worker] Malformed payload. Routing directly to DLQ.");
                channel.reject(msg, false);
            } else {
                // System or server connection issue; acknowledge the queue job and rely on the database retry logic
                channel.ack(msg);
            }
        } finally {
            activeJobsCount--;

            // If shutdown signal was received, exit the process once the current job finishes
            if (isShuttingDown && activeJobsCount === 0) {
                console.log("[Worker] Active jobs resolved. Exiting worker process.");
                process.exit(0);
            }
        }
    });

    consumerTag = consumeResult.consumerTag;
}

/**
 * Handles graceful shutdown by canceling queue consumer, waiting for active jobs, and closing connections.
 * 
 * @param signal - OS termination signal name
 */
async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}. Commencing graceful worker shutdown...`);

    try {
        const channel = await queueClient.connect();

        // 1. Cancel RabbitMQ consumer to stop receiving new jobs
        if (consumerTag && channel) {
            console.log("[Worker] Canceling RabbitMQ consumer...");
            await channel.cancel(consumerTag);
        }

        // 2. Wait for currently processing tasks to finish (with a 30s timeout)
        const shutdownTimeout = 30000;
        const checkInterval = 500;
        let elapsed = 0;

        while (activeJobsCount > 0 && elapsed < shutdownTimeout) {
            console.log(`[Worker] Waiting for ${activeJobsCount} active job(s) to finish... (${elapsed / 1000}s)`);
            await new Promise((resolve) => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;
        }

        if (activeJobsCount > 0) {
            console.warn(`[Worker] Warning: Shutdown timeout exceeded. Killing ${activeJobsCount} active job(s).`);
        } else {
            console.log("[Worker] All active jobs finished cleanly.");
        }

        // 3. Close RabbitMQ connection channel
        await queueClient.close();

        // 4. Disconnect database client
        await prisma.$disconnect();
        console.log("👋 Worker shutdown completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("[Worker] Error encountered during shutdown:", err);
        process.exit(1);
    }
}

// Hook process signal handlers
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Launch worker
startWorker().catch((err) => {
    console.error("❌ Critical worker startup crash:", err);
    process.exit(1);
});
