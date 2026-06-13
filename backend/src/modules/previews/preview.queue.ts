import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

export const QUEUE_CONFIG = {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
    exchange: "previews_exchange",
    dlx: "previews_dlx",
    queue: "previews_queue",
    dlq: "previews_dlq",
    routingKey: "process",
    dlqRoutingKey: "dead_letter",
};

export class PreviewQueueClient {
    private connection: amqp.ChannelModel | null = null;
    private channel: amqp.Channel | null = null;
    private isConnecting: boolean = false;

    /**
     * Connects to RabbitMQ and declares the exchanges, queues, and bindings.
     */
    public async connect(): Promise<amqp.Channel> {
        if (this.channel) return this.channel;
        if (this.isConnecting) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return this.connect();
        }

        this.isConnecting = true;
        let attempt = 0;
        const maxAttempts = 5;

        while (attempt < maxAttempts) {
            try {
                console.log(`[PreviewQueueClient] Connecting to RabbitMQ at ${QUEUE_CONFIG.url}...`);
                const conn = await amqp.connect(QUEUE_CONFIG.url);
                this.connection = conn;

                const ch = await conn.createChannel();
                this.channel = ch;

                // Setup connection listeners for reconnection
                conn.on("error", (err: any) => {
                    console.error("[PreviewQueueClient] Connection error:", err);
                    this.handleDisconnect();
                });

                conn.on("close", () => {
                    console.warn("[PreviewQueueClient] Connection closed.");
                    this.handleDisconnect();
                });

                // Initialize exchanges, queues, and Dead Letter Queue (DLQ)
                await this.setupTopology();
                
                console.log("[PreviewQueueClient] RabbitMQ connected and topologies initialized successfully.");
                this.isConnecting = false;
                return ch;
            } catch (error) {
                attempt++;
                console.error(`[PreviewQueueClient] Connection attempt ${attempt} failed:`, error);
                if (attempt >= maxAttempts) {
                    this.isConnecting = false;
                    throw new Error("Could not connect to RabbitMQ after maximum retries.");
                }
                await new Promise((resolve) => setTimeout(resolve, 3000)); // wait 3s before retry
            }
        }

        this.isConnecting = false;
        throw new Error("Could not connect to RabbitMQ.");
    }

    /**
     * Declares exchanges, queues, and sets up bindings with DLQ arguments.
     */
    private async setupTopology(): Promise<void> {
        if (!this.channel) return;

        // 1. Declare exchanges
        await this.channel.assertExchange(QUEUE_CONFIG.exchange, "direct", { durable: true });
        await this.channel.assertExchange(QUEUE_CONFIG.dlx, "direct", { durable: true });

        // 2. Declare Dead Letter Queue (DLQ)
        await this.channel.assertQueue(QUEUE_CONFIG.dlq, { durable: true });
        await this.channel.bindQueue(QUEUE_CONFIG.dlq, QUEUE_CONFIG.dlx, QUEUE_CONFIG.dlqRoutingKey);

        // 3. Declare Main Job Queue with Dead Letter Queue routing configuration
        await this.channel.assertQueue(QUEUE_CONFIG.queue, {
            durable: true,
            arguments: {
                "x-dead-letter-exchange": QUEUE_CONFIG.dlx,
                "x-dead-letter-routing-key": QUEUE_CONFIG.dlqRoutingKey,
            },
        });

        // 4. Bind Main Queue
        await this.channel.bindQueue(QUEUE_CONFIG.queue, QUEUE_CONFIG.exchange, QUEUE_CONFIG.routingKey);
    }

    /**
     * Cleans up channel and connection cache on disconnect.
     */
    private handleDisconnect(): void {
        this.channel = null;
        this.connection = null;
    }

    /**
     * Publishes a preview job to the queue.
     * 
     * @param fileId - The database File ID
     */
    public async publishJob(fileId: string): Promise<boolean> {
        try {
            const ch = await this.connect();
            const message = JSON.stringify({ fileId, timestamp: Date.now() });
            
            const success = ch.publish(
                QUEUE_CONFIG.exchange,
                QUEUE_CONFIG.routingKey,
                Buffer.from(message),
                { persistent: true } // ensures job survives RabbitMQ restarts
            );

            if (success) {
                console.log(`[PreviewQueueClient] Job published successfully for file: ${fileId}`);
            } else {
                console.warn(`[PreviewQueueClient] Job publish returned false for file: ${fileId}`);
            }
            return success;
        } catch (error) {
            console.error(`[PreviewQueueClient] Failed to publish preview job for file ${fileId}:`, error);
            return false;
        }
    }

    /**
     * Gracefully closes the RabbitMQ connection.
     */
    public async close(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            console.log("[PreviewQueueClient] Connection closed gracefully.");
        } catch (err) {
            console.error("[PreviewQueueClient] Error closing RabbitMQ connections:", err);
        } finally {
            this.handleDisconnect();
        }
    }
}

// Export a single global instance for publishing
export const globalPreviewQueueClient = new PreviewQueueClient();
