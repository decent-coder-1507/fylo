import { Request, Response } from "express";
import { globalUploadOrchestrator } from "./uploads.orchestrator";
import { globalUploadSessionService } from "./uploads.session";

/**
 * Controller endpoint for handling direct file uploads.
 * Optionally integrates with an existing session ID if supplied.
 */
export const uploadFileController = async (req: Request, res: Response) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { folderId, sessionId } = req.body;

        const result = await globalUploadOrchestrator.orchestrate({
            filePath: file.path,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            folderId,
            sessionId,
        });

        res.json(result.file);
    } catch (error: any) {
        console.error("❌ Upload Error:", error);
        res.status(500).json({ error: error?.message || "Failed to upload file" });
    }
};

/**
 * Controller endpoint for initializing a new upload session workflow.
 */
export const createUploadSessionController = async (req: Request, res: Response) => {
    try {
        const { fileName, size, mimeType, folderId } = req.body;

        if (!fileName || size === undefined) {
            return res.status(400).json({ error: "fileName and size are required fields" });
        }

        const session = await globalUploadSessionService.createSession(
            fileName,
            Number(size),
            mimeType,
            folderId
        );

        res.status(201).json(session);
    } catch (error: any) {
        console.error("❌ Create Upload Session Error:", error);
        res.status(500).json({ error: error?.message || "Failed to create upload session" });
    }
};

/**
 * Controller endpoint for retrieving details and progress of a specific upload session.
 */
export const getUploadSessionController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const session = await globalUploadSessionService.getSession(id as string);

        if (!session) {
            return res.status(404).json({ error: "Upload session not found" });
        }

        res.json(session);
    } catch (error: any) {
        console.error("❌ Get Upload Session Error:", error);
        res.status(500).json({ error: error?.message || "Failed to retrieve upload session" });
    }
};

/**
 * Controller endpoint for listing recent upload session workflows.
 */
export const listUploadSessionsController = async (req: Request, res: Response) => {
    try {
        const sessions = await globalUploadSessionService.listSessions();
        res.json(sessions);
    } catch (error: any) {
        console.error("❌ List Upload Sessions Error:", error);
        res.status(500).json({ error: error?.message || "Failed to list upload sessions" });
    }
};
