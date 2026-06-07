import { Request, Response } from "express";
import { createShareLinkService, resolveShareLinkService, getShareLinkInfoService } from "./share.service";

export const createShareLinkController = async (req: Request, res: Response) => {
    try {
        const { fileId, expiresInHours, maxUses } = req.body;

        if (!fileId) {
            return res.status(400).json({ error: "fileId is required" });
        }

        const shareLink = await createShareLinkService({
            fileId,
            expiresInHours: expiresInHours ? Number(expiresInHours) : undefined,
            maxUses: maxUses ? Number(maxUses) : undefined
        });

        const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
        const shareUrl = `${clientUrl}/share/${shareLink.token}`;
        const downloadUrl = `${req.protocol}://${req.get("host")}/api/share/${shareLink.token}/download`;

        res.json({
            ...shareLink,
            shareUrl,
            downloadUrl
        });
    } catch (error: any) {
        console.error("❌ Create Share Link Error:", error);
        res.status(500).json({ error: error.message || "Failed to create share link" });
    }
};

export const getShareLinkInfoController = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ error: "Token is required" });
        }

        const info = await getShareLinkInfoService(token);
        const downloadUrl = `${req.protocol}://${req.get("host")}/api/share/${token}/download`;

        res.json({
            ...info,
            downloadUrl
        });
    } catch (error: any) {
        console.error("❌ Get Share Link Info Error:", error);
        res.status(404).json({ error: error.message || "Failed to get share link info" });
    }
};

export const downloadShareLinkController = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ error: "Token is required" });
        }

        const fileData = await resolveShareLinkService(token);

        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileData.name)}"`);
        res.setHeader("Content-Type", fileData.mimeType);
        res.send(fileData.buffer);
    } catch (error: any) {
        console.error("❌ Download Share Link Error:", error);
        res.status(404).json({ error: error.message || "Failed to resolve share link" });
    }
};
