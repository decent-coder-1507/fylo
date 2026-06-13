import { PreviewContext, PreviewResult } from "./previews.types";

/**
 * Interface that all file preview processors must implement.
 * Ensures compatibility with the open/closed principle for new file formats.
 */
export interface PreviewProcessor {
    /**
     * The unique identifier/name of the processor (e.g. 'image-processor', 'video-processor').
     */
    readonly name: string;

    /**
     * Evaluates if this processor is capable of handling the file based on its MIME type and file name.
     * 
     * @param mimeType - The MIME type of the file
     * @param fileName - The original file name
     * @returns boolean - True if the processor can handle the file
     */
    canProcess(mimeType: string, fileName: string): boolean;

    /**
     * Core method to process the file and generate preview assets/metadata.
     * 
     * @param context - The context containing file information and local path
     * @returns Promise<PreviewResult> - The generated assets and metadata
     */
    process(context: PreviewContext): Promise<PreviewResult>;
}
