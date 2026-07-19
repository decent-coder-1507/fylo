export class AiError extends Error {
    constructor(
        message: string,
        public readonly code: string = "AI_UNKNOWN_ERROR",
        public readonly originalError?: any
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class AiRateLimitError extends AiError {
    constructor(message: string, originalError?: any) {
        super(message, "AI_RATE_LIMIT_ERROR", originalError);
    }
}

export class AiTimeoutError extends AiError {
    constructor(message: string, originalError?: any) {
        super(message, "AI_TIMEOUT_ERROR", originalError);
    }
}

export class AiAuthError extends AiError {
    constructor(message: string, originalError?: any) {
        super(message, "AI_AUTH_ERROR", originalError);
    }
}

export class AiInvalidRequestError extends AiError {
    constructor(message: string, originalError?: any) {
        super(message, "AI_INVALID_REQUEST_ERROR", originalError);
    }
}

export class AiProviderError extends AiError {
    constructor(message: string, originalError?: any) {
        super(message, "AI_PROVIDER_ERROR", originalError);
    }
}

/**
 * Maps raw SDK/HTTP errors to custom, domain-specific AI error instances.
 */
export function mapToAiError(err: any): Error {
    if (err instanceof AiError) {
        return err;
    }

    const message = err?.message || "Unknown AI error occurred";
    const status = err?.status || err?.statusCode || err?.code || 0;

    // Check for rate limiting
    if (status === 429 || message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("quota exceeded")) {
        return new AiRateLimitError("AI request was rate limited or quota was exceeded.", err);
    }

    // Check for auth issues
    if (status === 401 || status === 403 || message.toLowerCase().includes("api key") || message.toLowerCase().includes("auth") || message.toLowerCase().includes("unauthorized")) {
        return new AiAuthError("AI request failed authentication. Please verify GEMINI_API_KEY.", err);
    }

    // Check for bad requests / invalid models
    if (status === 400 || message.toLowerCase().includes("invalid argument") || message.toLowerCase().includes("bad request")) {
        return new AiInvalidRequestError(`AI request was invalid: ${message}`, err);
    }

    // Check for timeouts
    if (err?.name === "AbortError" || message.toLowerCase().includes("timeout") || message.toLowerCase().includes("deadline exceeded")) {
        return new AiTimeoutError("AI request timed out.", err);
    }

    // Fallback to general provider error
    return new AiProviderError(`AI Provider Error: ${message}`, err);
}
