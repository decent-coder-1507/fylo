/**
 * Reusable JSON Schema for file classification and knowledge processing.
 */
export const knowledgeProcessingSchema = {
    type: "OBJECT",
    properties: {
        summary: {
            type: "STRING",
            description: "A comprehensive summary of the file content, explaining its purpose and functionality."
        },
        shortSummary: {
            type: "STRING",
            description: "A concise, single-sentence summary of the file content."
        },
        tags: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Suggested organization tags based on the file name, extension, and content."
        },
        technologies: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Specific frameworks, libraries, languages, databases, or tools detected (e.g. Prisma, React, Express)."
        },
        category: {
            type: "STRING",
            description: "General classification of the file (e.g., Code, Documentation, Configuration, Dataset, Media, WebPage, Other)."
        },
        programmingLanguage: {
            type: "STRING",
            description: "Programming language of the file content (e.g. TypeScript, Python, Rust, Shell, or 'None' if not applicable)."
        }
    },
    required: ["summary", "shortSummary", "tags", "technologies", "category", "programmingLanguage"]
};

export interface KnowledgeProcessingOutput {
    summary: string;
    shortSummary: string;
    tags: string[];
    technologies: string[];
    category: string;
    programmingLanguage: string;
}

export const chatResponseSchema = {
    type: "OBJECT",
    properties: {
        answer: {
            type: "STRING",
            description: "The direct, natural language answer to the user's query, fully grounded on the provided context documents. If the answer cannot be found in the context documents, output a response stating that the information was not found."
        },
        confidence: {
            type: "STRING",
            enum: ["high", "medium", "low", "none"],
            description: "Confidence level of the answer based on the clarity and completeness of the retrieved documents."
        },
        citations: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    fileId: { type: "STRING", description: "The unique ID of the document referenced." },
                    fileName: { type: "STRING", description: "The name of the document referenced." },
                    snippet: { type: "STRING", description: "The specific snippet, quote, or sentence from the document supporting the citation." }
                },
                required: ["fileId", "fileName", "snippet"]
            },
            description: "A list of sources and exact citations used from the context to construct the answer."
        }
    },
    required: ["answer", "confidence", "citations"]
};

export interface ChatResponseOutput {
    answer: string;
    confidence: "high" | "medium" | "low" | "none";
    citations: Array<{
        fileId: string;
        fileName: string;
        snippet: string;
    }>;
}
