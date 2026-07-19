import amqp from "amqplib";

export const AI_PROCESSING_QUEUE_CONFIG = {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
    exchange: "ai_processing_exchange",
    queue: "ai_processing_queue",
    routingKey: "process",
};

/** Publishes durable AI enrichment jobs without coupling uploads to worker availability. */
export class AiProcessingQueueClient {
    private connection: amqp.ChannelModel | null = null;
    private channel: amqp.Channel | null = null;

    public async connect(): Promise<amqp.Channel> {
        if (this.channel) return this.channel;

        const connection = await amqp.connect(AI_PROCESSING_QUEUE_CONFIG.url);
        const channel = await connection.createChannel();
        this.connection = connection;
        this.channel = channel;

        connection.on("close", () => this.reset());
        connection.on("error", () => this.reset());

        await channel.assertExchange(AI_PROCESSING_QUEUE_CONFIG.exchange, "direct", { durable: true });
        await channel.assertQueue(AI_PROCESSING_QUEUE_CONFIG.queue, { durable: true });
        await channel.bindQueue(
            AI_PROCESSING_QUEUE_CONFIG.queue,
            AI_PROCESSING_QUEUE_CONFIG.exchange,
            AI_PROCESSING_QUEUE_CONFIG.routingKey,
        );

        return channel;
    }

    public async publish(fileId: string): Promise<boolean> {
        const channel = await this.connect();
        return channel.publish(
            AI_PROCESSING_QUEUE_CONFIG.exchange,
            AI_PROCESSING_QUEUE_CONFIG.routingKey,
            Buffer.from(JSON.stringify({ fileId, timestamp: Date.now() })),
            { persistent: true },
        );
    }

    public async close(): Promise<void> {
        await this.channel?.close();
        await this.connection?.close();
        this.reset();
    }

    private reset(): void {
        this.channel = null;
        this.connection = null;
    }
}

export const globalAiProcessingQueueClient = new AiProcessingQueueClient();
