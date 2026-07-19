import prisma from "../../lib/db/prisma";
import { initTelegram } from "../../lib/telegram/auth";
import { AiProcessingQueueClient, AI_PROCESSING_QUEUE_CONFIG } from "./ai-processing.queue";
import { enqueueAiProcessing, processAiProcessingJob, reschedulePendingAiProcessing } from "./ai-processing.service";

const queueClient = new AiProcessingQueueClient();

async function startWorker(): Promise<void> {
    await prisma.$connect();
    await initTelegram();
    const channel = await queueClient.connect();
    await channel.prefetch(1);

    const recovered = await reschedulePendingAiProcessing();
    console.log(`[AiProcessingWorker] Requeued ${recovered} pending job(s).`);

    console.log(`[AiProcessingWorker] Waiting for messages in ${AI_PROCESSING_QUEUE_CONFIG.queue}`);
    await channel.consume(AI_PROCESSING_QUEUE_CONFIG.queue, async (message) => {
        if (!message) return;

        try {
            const payload = JSON.parse(message.content.toString()) as { fileId?: string };
            if (!payload.fileId) {
                channel.reject(message, false);
                return;
            }

            await processAiProcessingJob(payload.fileId);
            channel.ack(message);
        } catch (error) {
            console.error("[AiProcessingWorker] Job failed:", error);
            // Retry through the durable job state rather than broker redelivery.
            // The service stops republishing once maxAttempts has been reached.
            try {
                const payload = JSON.parse(message.content.toString()) as { fileId?: string };
                if (payload.fileId) await enqueueAiProcessing(payload.fileId);
            } catch (retryError) {
                console.error("[AiProcessingWorker] Failed to reschedule job:", retryError);
            }
            channel.ack(message);
        }
    });
}

async function shutdown(): Promise<void> {
    await queueClient.close();
    await prisma.$disconnect();
    process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

startWorker().catch((error) => {
    console.error("[AiProcessingWorker] Startup failed:", error);
    process.exit(1);
});
