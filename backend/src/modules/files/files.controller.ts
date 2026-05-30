import { Request, Response } from "express";
import { uploadFileService, listFilesService } from "./files.service";

export const uploadFileController = async (req: Request, res: Response) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { folderId } = req.body;

        const result = await uploadFileService(file.path, folderId);

        res.json(result);
    } catch (error) {
        console.log("❌ Upload Error:", error);
        res.status(500).json({ error: "Failed to upload file" })
    }
}

export const listFilesController = async (req: Request, res: Response) => {
    try {
        // sending filters as query params
        const result = await listFilesService({
            page: Number(req.query.page),
            limit: Number(req.query.limit),

            folderId: req.query.folderId as string,

            search: req.query.search as string,

            sortBy: req.query.sortBy as any,
            sortOrder: req.query.sortOrder as any
        });

        res.json(result);
    } catch (err) {
        console.log(`❌ List files error: ${err}`)

        res.status(500).json({ error: `Failed to fetch files` })
    }
}