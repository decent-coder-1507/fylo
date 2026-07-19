import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const prismaClientSingleton = () => {
    const isDev = process.env.NODE_ENV !== "production";
    const isWorker = process.argv.some(arg => arg.includes("worker"));

    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: isDev ? (isWorker ? 2 : 3) : 10, // Limit connections in dev to prevent pool exhaustion (especially with watch restarts)
        idleTimeoutMillis: 10000, // Close idle connections after 10 seconds to avoid silent drops by pooler/load balancer
        connectionTimeoutMillis: 30000, // Return an error after 30 seconds if connection fails to establish
        keepAlive: true, // Enable TCP keep-alive
    });

    // Prevent unhandled exceptions from background connection issues on idle clients
    pool.on("error", (err) => {
        console.error("⚠️ Unexpected error on idle database client:", err);
    });

    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter });

    // Extend the client with automatic retries for transient connection errors
    return client.$extends({
        query: {
            async $allOperations({ operation, args, query }) {
                const maxRetries = 3;
                let attempt = 0;
                while (true) {
                    try {
                        return await query(args);
                    } catch (error: any) {
                        attempt++;
                        const isTransient =
                            error.code === "P1001" || // Can't reach database server
                            error.code === "P2024" || // Connection timeout
                            error.message?.includes("Can't reach database server") ||
                            error.message?.includes("Connection terminated") ||
                            error.message?.includes("timeout exceeded") ||
                            error.message?.includes("Connection reset") ||
                            error.message?.includes("Connection terminated unexpectedly");

                        if (attempt >= maxRetries || !isTransient) {
                            throw error;
                        }

                        console.warn(
                            `⚠️ Database query failed (attempt ${attempt}/${maxRetries}) due to a transient connection issue. Retrying in ${100 * attempt}ms... Error: ${error.message || error}`
                        );
                        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
                    }
                }
            }
        }
    });
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = prisma;
}