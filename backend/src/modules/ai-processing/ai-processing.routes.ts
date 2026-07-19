import { Router, Request, Response } from "express";
import { AiProcessingInput, AiProcessingOutput } from "./ai-processor";

const router = Router();

router.post("/mock-process", (req: Request, res: Response) => {
    try {
        const input = req.body as AiProcessingInput;
        console.log(`[AI Mock Processor] Processing file: ${input.file.name} (${input.file.id})`);

        const fileName = input.file.name;
        const text = input.content.text || "";
        const tags = new Set<string>();

        // Basic tag generation from extension
        const ext = fileName.split(".").pop()?.toLowerCase();
        if (ext) tags.add(ext);

        // Basic tag generation from name
        if (fileName.toLowerCase().includes("release")) tags.add("release");
        if (fileName.toLowerCase().includes("build")) tags.add("build");
        if (fileName.toLowerCase().includes("test")) tags.add("test");
        if (fileName.toLowerCase().includes("config")) tags.add("config");
        if (fileName.toLowerCase().includes("setup")) tags.add("setup");

        // Basic tag generation from content keywords
        const keywords = ["schema", "prisma", "database", "api", "auth", "service", "controller", "route"];
        const lowerText = text.toLowerCase();
        for (const kw of keywords) {
            if (lowerText.includes(kw)) {
                tags.add(kw);
            }
        }

        // Generate summary
        let summary = `Automatically generated summary for "${fileName}".`;
        if (text) {
            const cleanText = text.replace(/\s+/g, " ").trim();
            const sentence = cleanText.split(".")[0];
            summary = `This file contains text content. First sentence: "${sentence}."`;
        } else if (input.content.metadata) {
            const meta = input.content.metadata;
            summary = `This is a binary/media file with metadata: ${JSON.stringify(meta)}.`;
        }

        const output: AiProcessingOutput = {
            summary,
            suggestedTags: Array.from(tags),
            result: {
                processedBy: "Fylo Mock AI Engine",
                processedAt: new Date().toISOString(),
                confidenceScore: 0.98,
            },
        };

        res.json(output);
    } catch (err: any) {
        console.error("[AI Mock Processor] Error:", err);
        res.status(500).json({ error: "AI Mock Processing failed" });
    }
});

export default router;
