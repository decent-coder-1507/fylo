import { Request, Response } from "express";
import { chatService } from "./chat.service";

export const chatController = async (req: Request, res: Response) => {
    try {
        const { query, folderId, limit, history } = req.body;

        if (!query) {
            res.status(400).json({ error: "Query is required." });
            return;
        }

        const result = await chatService({
            query,
            folderId,
            limit: limit ? Number(limit) : undefined,
            history
        });

        res.json(result);
    } catch (err: any) {
        console.error("❌ Chat Controller Error:", err);
        res.status(500).json({ error: err?.message || "Failed to generate chat response" });
    }
};
