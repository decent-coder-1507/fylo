import { Request, Response } from "express";
import { uploadFileService, listFilesService, downloadFileService } from "./files.service";

export const uploadFileController = async (req: Request, res: Response) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { folderId } = req.body;

        const result = await uploadFileService(file.path, file.originalname, file.mimetype, folderId);

        res.json(result);
    } catch (error) {
        console.log("❌ Upload Error:", error);
        res.status(500).json({ error: "Failed to upload file" })
    }
}

export const downloadFileController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const fileData = await downloadFileService(id as string);

        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileData.name)}"`);
        res.setHeader("Content-Type", fileData.mimeType);
        res.send(fileData.buffer);
    } catch (error) {
        console.log("❌ Download Error:", error);
        res.status(500).json({ error: "Failed to download file" })
    }
}

export const listFilesController = async (req: Request, res: Response) => {
    try {
        const parsedPage = req.query.page ? Number(req.query.page) : undefined;
        const parsedLimit = req.query.limit ? Number(req.query.limit) : undefined;

        const result = await listFilesService({
            page: parsedPage && !isNaN(parsedPage) ? parsedPage : undefined,
            limit: parsedLimit && !isNaN(parsedLimit) ? parsedLimit : undefined,

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