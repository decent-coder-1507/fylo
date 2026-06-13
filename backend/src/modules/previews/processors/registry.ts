import { PreviewProcessor } from "../previews.processor";
import { ImagePreviewProcessor } from "./image.processor";
import { PDFPreviewProcessor } from "./pdf.processor";

/**
 * A registry to manage and select preview processors based on MIME types and file extensions.
 * Follows the Open/Closed Principle by allowing dynamic registration of new processors.
 */
export class ProcessorRegistry {
    private readonly processors: Map<string, PreviewProcessor> = new Map();

    /**
     * Registers a new PreviewProcessor.
     * 
     * @param processor - The processor implementation to register
     */
    public register(processor: PreviewProcessor): void {
        if (this.processors.has(processor.name)) {
            console.warn(`[ProcessorRegistry] Overwriting existing processor: ${processor.name}`);
        }
        this.processors.set(processor.name, processor);
    }

    /**
     * Finds the first registered processor that can handle the file type.
     * 
     * @param mimeType - MIME type of the file
     * @param fileName - Original name of the file
     * @returns PreviewProcessor | undefined
     */
    public getProcessor(mimeType: string, fileName: string): PreviewProcessor | undefined {
        for (const processor of this.processors.values()) {
            try {
                if (processor.canProcess(mimeType, fileName)) {
                    return processor;
                }
            } catch (err) {
                console.error(`[ProcessorRegistry] Error calling canProcess on ${processor.name}:`, err);
            }
        }
        return undefined;
    }

    /**
     * Unregisters a processor by name.
     * 
     * @param name - The name of the processor to remove
     * @returns boolean - True if the processor was found and removed
     */
    public unregister(name: string): boolean {
        return this.processors.delete(name);
    }

    /**
     * Gets all registered processors.
     */
    public getProcessors(): PreviewProcessor[] {
        return Array.from(this.processors.values());
    }
}

// Global registry instance for application-wide use
export const globalProcessorRegistry = new ProcessorRegistry();

// Register default processors
globalProcessorRegistry.register(new ImagePreviewProcessor());
globalProcessorRegistry.register(new PDFPreviewProcessor());


