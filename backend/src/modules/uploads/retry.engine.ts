import { globalUploadSessionService } from "./uploads.session";

export interface RetryPolicy {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffFactor: number;
    timeoutMs: number; // timeout for each individual attempt
}

export class RetryEngine {
    private readonly defaultPolicy: RetryPolicy = {
        maxAttempts: 5,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffFactor: 2,
        timeoutMs: 120000, // 2 minutes timeout
    };

    /**
     * Executes an upload operation with the configured retry policy.
     */
    public async executeWithRetry<T>(
        sessionId: string,
        operation: () => Promise<T>,
        policy: Partial<RetryPolicy> = {}
    ): Promise<T> {
        const activePolicy = { ...this.defaultPolicy, ...policy };
        let attempt = 0;
        let delay = activePolicy.initialDelayMs;

        while (true) {
            attempt++;
            try {
                // Execute the operation with a timeout
                return await this.executeWithTimeout(operation, activePolicy.timeoutMs);
            } catch (error: any) {
                console.error(`[RetryEngine] Attempt ${attempt} failed for session ${sessionId}:`, error.message || error);

                if (attempt >= activePolicy.maxAttempts || !this.isRecoverable(error)) {
                    // Maximum attempts reached or unrecoverable error
                    throw error;
                }

                // Calculate backoff delay
                let sleepTime = delay;
                const floodWaitSeconds = this.getFloodWaitSeconds(error);
                if (floodWaitSeconds !== null) {
                    console.log(`[RetryEngine] Telegram FloodWait detected. Must wait for ${floodWaitSeconds} seconds.`);
                    sleepTime = floodWaitSeconds * 1000;
                } else {
                    // Apply exponential backoff
                    delay = Math.min(delay * activePolicy.backoffFactor, activePolicy.maxDelayMs);
                }

                // Update UploadSession with retry details
                try {
                    const session = await globalUploadSessionService.getSession(sessionId);
                    if (session && session.plan) {
                        const updatedPlan = {
                            ...session.plan,
                            retryState: {
                                currentAttempt: attempt,
                                maxAttempts: activePolicy.maxAttempts,
                                nextAttemptAt: new Date(Date.now() + sleepTime).toISOString(),
                                lastError: error.message || String(error),
                            }
                        };
                        await globalUploadSessionService.updateSessionStatus(sessionId, "UPLOADING", {
                            plan: updatedPlan
                        });
                    }
                } catch (sessionUpdateErr) {
                    console.error(`⚠️ Failed to update retry metadata for session ${sessionId}:`, sessionUpdateErr);
                }

                console.log(`[RetryEngine] Retrying in ${sleepTime}ms (Attempt ${attempt + 1}/${activePolicy.maxAttempts})...`);
                await this.sleep(sleepTime);
            }
        }
    }

    /**
     * Executes a promise-returning callback but rejects if it exceeds timeoutMs.
     */
    private async executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
        let timeoutHandle: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error(`Timeout of ${timeoutMs}ms exceeded`));
            }, timeoutMs);
        });

        try {
            return await Promise.race([operation(), timeoutPromise]);
        } finally {
            clearTimeout(timeoutHandle!);
        }
    }

    /**
     * Checks if an error is recoverable (e.g. network drops, Telegram flood wait, server 5xx).
     */
    private isRecoverable(error: any): boolean {
        const msg = String(error.message || error).toLowerCase();

        // Unrecoverable errors
        if (msg.includes("not found") || msg.includes("enoent")) return false;
        if (msg.includes("unauthorized") || msg.includes("invalid credentials")) return false;
        if (msg.includes("access denied") || msg.includes("forbidden")) return false;
        if (msg.includes("invalid folder") || msg.includes("not a directory")) return false;
        if (msg.includes("validation failed")) return false;

        // Recoverable errors: timeout, rate limit, network/socket reset, server errors
        if (msg.includes("timeout") || msg.includes("econnreset") || msg.includes("econnrefused")) return true;
        if (msg.includes("flood") || msg.includes("rate limit") || msg.includes("wait")) return true;
        if (msg.includes("network") || msg.includes("socket") || msg.includes("abort")) return true;
        if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504")) return true;

        // By default, treat unknown operational errors as recoverable
        return true;
    }

    /**
     * Parses Telegram FloodWait seconds if present in the error message.
     * Example messages: "FLOOD_WAIT_30", "A wait of 30 seconds is required"
     */
    private getFloodWaitSeconds(error: any): number | null {
        const msg = String(error.message || error);
        
        // Match FLOOD_WAIT_X
        const floodWaitMatch = msg.match(/FLOOD_WAIT_(\d+)/i);
        if (floodWaitMatch) {
            return parseInt(floodWaitMatch[1], 10);
        }

        // Match "wait of X seconds"
        const waitSecondsMatch = msg.match(/wait of (\d+) seconds/i);
        if (waitSecondsMatch) {
            return parseInt(waitSecondsMatch[1], 10);
        }

        return null;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export const globalRetryEngine = new RetryEngine();
