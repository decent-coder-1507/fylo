import { Request, Response } from "express";
import { getOrCreateFilePreview, getLocalPreviewAsset, getTextPreviewContent } from "./previews.service";
import { client } from "../../lib/telegram/client";
import prisma from "../../lib/db/prisma";
import { globalStorageProvider } from "../storage/storage.factory";

/**
 * Controller to fetch or trigger the file preview status and metadata.
 * Validates inputs and checks Telegram authorization status.
 */
export const getFilePreviewController = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        // 1. Authorization check
        const isAuth = await client.isUserAuthorized();
        if (!isAuth) {
            return res.status(401).json({ error: "Unauthorized: Telegram session is not connected." });
        }

        // 2. Validation check
        if (!id) {
            return res.status(400).json({ error: "File ID is required" });
        }

        const preview = await getOrCreateFilePreview(id);

        const fileRecord = await prisma.file.findUnique({
            where: { id },
            select: { name: true }
        });

        const host = req.get("host");
        const protocol = req.protocol;
        const baseUrl = `${protocol}://${host}`;

        // Construct response URLs
        let thumbnailUrl = null;
        let previewUrl = null;

        const isPrivateR2Url = (url: string) => {
            return url.includes("cloudflarestorage.com") && !process.env.R2_PUBLIC_URL_PREFIX;
        };

        if (preview.thumbnailUrl) {
            thumbnailUrl = (preview.thumbnailUrl.startsWith("http") && !isPrivateR2Url(preview.thumbnailUrl))
                ? preview.thumbnailUrl
                : `${baseUrl}/api/files/${id}/preview/thumbnail`;
        }

        const isWebFriendlyImage = (fileName: string) => {
            const ext = fileName.split(".").pop()?.toLowerCase() || "";
            return ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext);
        };

        if (preview.previewUrl) {
            previewUrl = (preview.previewUrl.startsWith("http") && !isPrivateR2Url(preview.previewUrl))
                ? preview.previewUrl
                : `${baseUrl}/api/files/${id}/preview/content`;
        } else if (fileRecord && isWebFriendlyImage(fileRecord.name) && preview.status === "COMPLETED") {
            previewUrl = `${baseUrl}/api/files/${id}/download`;
        }

        return res.json({
            id: preview.id,
            fileId: preview.fileId,
            status: preview.status,
            metadata: preview.metadata,
            thumbnailUrl,
            previewUrl,
            error: preview.error,
            attempts: preview.attempts,
            maxAttempts: preview.maxAttempts,
            startedAt: preview.startedAt,
            completedAt: preview.completedAt,
        });
    } catch (error: any) {
        console.error("❌ Get File Preview Error:", error);
        if (error.message === "File not found") {
            return res.status(404).json({ error: "File not found" });
        }
        return res.status(500).json({ error: "Failed to get or create file preview" });
    }
};

/**
 * Controller to serve or redirect the preview thumbnail file.
 * Validates inputs and checks Telegram authorization status.
 */
export const getFileThumbnailAssetController = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        // 1. Authorization check
        const isAuth = await client.isUserAuthorized();
        if (!isAuth) {
            return res.status(401).json({ error: "Unauthorized: Telegram session is not connected." });
        }

        // 2. Validation check
        if (!id) {
            return res.status(400).json({ error: "File ID is required" });
        }

        const asset = await getLocalPreviewAsset(id, "thumbnail");

        if (asset.isRemote) {
            const downloaded = await globalStorageProvider.download(asset.url!);
            res.setHeader("Content-Type", downloaded.mimeType || asset.mimeType || "application/octet-stream");
            return res.send(downloaded.buffer);
        }

        res.setHeader("Content-Type", asset.mimeType!);
        return res.sendFile(asset.physicalPath!);
    } catch (error: any) {
        console.error("❌ Serve Thumbnail Error:", error);
        if (error.message === "Preview not found" || error.message.includes("not found")) {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to serve thumbnail asset" });
    }
};

/**
 * Controller to serve the full preview content.
 * Automatically switches between returning structured JSON for text/markdown/json/code files
 * and serving/redirecting physical image/pdf preview assets.
 * Validates inputs and checks Telegram authorization status.
 */
export const getFilePreviewAssetController = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        // 1. Authorization check
        const isAuth = await client.isUserAuthorized();
        if (!isAuth) {
            return res.status(401).json({ error: "Unauthorized: Telegram session is not connected." });
        }

        // 2. Validation check
        if (!id) {
            return res.status(400).json({ error: "File ID is required" });
        }

        // 3. Try handling as a text/code preview content first
        try {
            const textPreview = await getTextPreviewContent(id);
            return res.json(textPreview);
        } catch (err: any) {
            // If not a text/code file, fallback to image/pdf preview assets serving
            if (err.message.includes("not a supported text/code format")) {
                const asset = await getLocalPreviewAsset(id, "preview");

                if (asset.isRemote) {
                    const downloaded = await globalStorageProvider.download(asset.url!);
                    res.setHeader("Content-Type", downloaded.mimeType || asset.mimeType || "application/octet-stream");
                    return res.send(downloaded.buffer);
                }

                res.setHeader("Content-Type", asset.mimeType!);
                return res.sendFile(asset.physicalPath!);
            }
            throw err;
        }
    } catch (error: any) {
        console.error("❌ Serve Preview Asset Error:", error);
        if (error.message === "File not found" || error.message === "Preview not found" || error.message.includes("not found")) {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || "Failed to serve preview content asset" });
    }
};
