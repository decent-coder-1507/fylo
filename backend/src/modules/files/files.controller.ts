import { Request, Response } from "express";
import { listFilesService, downloadFileService, deleteFileService, searchFilesService } from "./files.service";


export const downloadFileController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const inline = req.query.inline === "true";
        const fileData = await downloadFileService(id as string);

        const disposition = inline ? "inline" : "attachment";
        res.setHeader("Content-Disposition", `${disposition}; filename="${encodeURIComponent(fileData.name)}"`);
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
            projectName: req.query.projectName as string,
            projectVersion: req.query.projectVersion as string,
            commitHash: req.query.commitHash as string,
            branchName: req.query.branchName as string,
            buildEnv: req.query.buildEnv as string,
            tags: req.query.tags as string,
            uploaderName: req.query.uploaderName as string,
            uploaderEmail: req.query.uploaderEmail as string,
            sortBy: req.query.sortBy as any,
            sortOrder: req.query.sortOrder as any
        });

        res.json(result);
    } catch (err) {
        console.log(`❌ List files error: ${err}`)

        res.status(500).json({ error: `Failed to fetch files` })
    }
}

export const searchFilesController = async (req: Request, res: Response) => {
    try {
        const query = req.query.query as string;
        const mode = req.query.mode as any;
        const folderId = req.query.folderId as string;
        const parsedLimit = req.query.limit ? Number(req.query.limit) : undefined;
        const parsedMinScore = req.query.minScore ? Number(req.query.minScore) : undefined;

        const result = await searchFilesService({
            query,
            mode,
            folderId,
            limit: parsedLimit && !isNaN(parsedLimit) ? parsedLimit : undefined,
            minScore: parsedMinScore && !isNaN(parsedMinScore) ? parsedMinScore : undefined,
        });

        res.json(result);
    } catch (err: any) {
        console.error("❌ Search Files Error:", err);
        res.status(500).json({ error: err?.message || "Failed to search files" });
    }
}

export const deleteFileController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await deleteFileService(id as string);
        res.json(result);
    } catch (error: any) {
        console.error("❌ Delete File Error:", error);
        res.status(500).json({ error: error?.message || "Failed to delete file" });
    }
};