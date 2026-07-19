import { GeminiProvider } from "./providers/gemini.provider";
import { modelRegistry, ModelType } from "./ai.config";
import { mapToAiError, AiRateLimitError } from "./ai.errors";
import {
    AiProvider,
    GenerateTextOptions,
    StructuredOutputOptions,
    EmbeddingOptions,
    AiResponse,
    StructuredResponse,
    EmbeddingResponse,
} from "./ai.types";

export class AiService {
    private provider: AiProvider;

    constructor(customProvider?: AiProvider) {
        // Default to Google Gemini provider
        this.provider = customProvider || new GeminiProvider();
        console.log(`ℹ️ [AI Service] Initialized with provider: ${this.provider.name}`);
    }

    /**
     * Swap the active AI provider at runtime.
     */
    public setProvider(newProvider: AiProvider): void {
        console.log(`🔄 [AI Service] Swapping provider: ${this.provider.name} -> ${newProvider.name}`);
        this.provider = newProvider;
    }

    /**
     * Get the name of the active AI provider.
     */
    public getProviderName(): string {
        return this.provider.name;
    }

    /**
     * Standard text generation helper.
     */
    public async generateText(
        modelType: ModelType,
        options: GenerateTextOptions
    ): Promise<AiResponse> {
        const operationName = `generateText:${modelType}`;
        const timeoutMs = options.timeoutMs ?? 30000;

        console.log(`🤖 [AI Service] Requesting text generation from active provider using model: ${modelRegistry.getModel(modelType)}`);

        return this.executeWithRetryAndTimeout(
            () => this.provider.generateText(modelType, options),
            {
                operationName,
                timeoutMs,
                retries: 3,
                delayMs: 1000,
            }
        );
    }

    /**
     * Structured JSON output generation helper.
     */
    public async generateStructured<T>(
        modelType: ModelType,
        options: StructuredOutputOptions
    ): Promise<StructuredResponse<T>> {
        const operationName = `generateStructured:${modelType}`;
        const timeoutMs = options.timeoutMs ?? 45000; // Structured output can take longer

        console.log(`📊 [AI Service] Requesting structured output from active provider using model: ${modelRegistry.getModel(modelType)}`);

        return this.executeWithRetryAndTimeout(
            () => this.provider.generateStructured<T>(modelType, options),
            {
                operationName,
                timeoutMs,
                retries: 3,
                delayMs: 1000,
            }
        );
    }

    /**
     * Generates vector embeddings for a given input text.
     */
    public async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
        const operationName = "embed";
        const timeoutMs = 15000; // Embeddings are usually fast

        console.log(`🧬 [AI Service] Generating embeddings from active provider using model: ${modelRegistry.getModel("embedding")}`);

        return this.executeWithRetryAndTimeout(
            () => this.provider.embed(options),
            {
                operationName,
                timeoutMs,
                retries: 3,
                delayMs: 500, // Faster retries for embeddings
            }
        );
    }

    /**
     * Executes an async operation with retry logic, exponential backoff, and timeouts.
     */
    private async executeWithRetryAndTimeout<T>(
        operation: () => Promise<T>,
        options: {
            retries: number;
            delayMs: number;
            timeoutMs: number;
            operationName: string;
        }
    ): Promise<T> {
        let attempt = 0;

        while (true) {
            attempt++;
            let timerId: NodeJS.Timeout | undefined;

            try {
                // Setup timeout mechanism
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timerId = setTimeout(() => {
                        reject(new Error(`Timeout: Operation "${options.operationName}" exceeded ${options.timeoutMs}ms limit.`));
                    }, options.timeoutMs);
                    // Unref if supported in this runtime to avoid keeping the event loop alive
                    timerId.unref?.();
                });

                // Race the operation against the timeout
                const result = await Promise.race([operation(), timeoutPromise]);

                if (timerId) clearTimeout(timerId);
                return result;
            } catch (error: any) {
                if (timerId) clearTimeout(timerId);

                const mappedError = mapToAiError(error);
                console.error(
                    `❌ [AI Service] Attempt ${attempt}/${options.retries} failed for "${options.operationName}". Error: ${mappedError.message}`
                );

                if (attempt >= options.retries) {
                    throw mappedError;
                }

                // Exponential backoff delay calculation
                let delay = options.delayMs * Math.pow(2, attempt - 1);
                
                // Add rate-limiting specific backoff scaling and random jitter to avoid collision/retry storms
                if (mappedError instanceof AiRateLimitError) {
                    delay = delay * 2 + Math.floor(Math.random() * 1000);
                    console.warn(`⏳ [AI Service] Rate limit hit. Backing off for ${delay}ms before next attempt...`);
                } else {
                    delay = delay + Math.floor(Math.random() * 200); // Standard jitter
                }
                
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
}

// Export a singleton instance of the AI service for application-wide use
export const globalAiService = new AiService();
