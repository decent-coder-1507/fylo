import { SUMMARIZER_INSTRUCTION } from "./summarizer.prompt";
import { TAGS_INSTRUCTION } from "./tags.prompt";
import { CATEGORY_INSTRUCTION } from "./category.prompt";
import { PROJECT_INSTRUCTION } from "./project.prompt";

export * from "./summarizer.prompt";
export * from "./tags.prompt";
export * from "./category.prompt";
export * from "./project.prompt";
export * from "./search.prompt";
export * from "./chat.prompt";

export const PROMPT_VERSIONS = {
    summarizer: "1.0.0",
    tags: "1.0.0",
    category: "1.0.0",
    project: "1.0.0",
    search: "1.0.0",
    chat: "1.0.0",
    knowledgeProcessingPipeline: "1.1.0"
};

export const KNOWLEDGE_PROCESSING_SYSTEM_INSTRUCTION =
    "You are an AI assistant designed to analyze files and extract knowledge. " +
    "You will be given a file's name, its MIME type, and its extracted text content. " +
    "Analyze the file and provide a structured representation with a comprehensive summary, " +
    "a short summary, suggested tags, detected technologies, a category classification, " +
    "and the programming language used. Follow these specific rules:\n" +
    `- Summary: ${SUMMARIZER_INSTRUCTION}\n` +
    `- Tags/Technologies: ${TAGS_INSTRUCTION}\n` +
    `- Category: ${CATEGORY_INSTRUCTION}\n` +
    `- Project/Language: ${PROJECT_INSTRUCTION}`;

export function buildKnowledgeProcessingPrompt(
    fileName: string,
    mimeType: string,
    content: string
): string {
    return (
        `File details:\n` +
        `- Name: ${fileName}\n` +
        `- MIME Type: ${mimeType}\n\n` +
        `Extracted Content:\n` +
        `"""\n` +
        `${content}\n` +
        `"""`
    );
}
