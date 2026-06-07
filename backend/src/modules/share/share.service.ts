import prisma from "../../lib/db/prisma";
import { downloadFileService } from "../files/files.service";
import { CreateShareLinkInput } from "./share.types";

export const createShareLinkService = async (input: CreateShareLinkInput) => {
    const { fileId, expiresInHours, maxUses } = input;

    // Verify file exists
    const file = await prisma.file.findUnique({
        where: { id: fileId }
    });

    if (!file) {
        throw new Error("File not found");
    }

    // Default expiry duration: 7 days (168 hours) if not specified
    const hours = expiresInHours !== undefined ? expiresInHours : 168;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);

    const shareLink = await prisma.shareLink.create({
        data: {
            fileId,
            expiresAt,
            maxUses: maxUses || null
        }
    });

    return shareLink;
};

export const resolveShareLinkService = async (token: string) => {
    const shareLink = await prisma.shareLink.findUnique({
        where: { token },
        include: { file: true }
    });

    if (!shareLink) {
        throw new Error("Share link not found or invalid");
    }

    // Check expiry
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
        throw new Error("Share link has expired");
    }

    // Check max uses
    if (shareLink.maxUses !== null && shareLink.useCount >= shareLink.maxUses) {
        throw new Error("Share link use limit reached");
    }

    // Increment use count
    await prisma.shareLink.update({
        where: { id: shareLink.id },
        data: { useCount: { increment: 1 } }
    });

    // Download file media from Telegram using existing downloadFileService
    const fileData = await downloadFileService(shareLink.fileId);

    return fileData;
};

export const getShareLinkInfoService = async (token: string) => {
    const shareLink = await prisma.shareLink.findUnique({
        where: { token },
        include: { file: true }
    });

    if (!shareLink) {
        throw new Error("Share link not found or invalid");
    }

    // Check expiry
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
        throw new Error("Share link has expired");
    }

    // Check max uses
    if (shareLink.maxUses !== null && shareLink.useCount >= shareLink.maxUses) {
        throw new Error("Share link use limit reached");
    }

    return {
        name: shareLink.file.name,
        size: shareLink.file.size,
        mimeType: shareLink.file.mimeType,
        createdAt: shareLink.createdAt,
        expiresAt: shareLink.expiresAt,
        maxUses: shareLink.maxUses,
        useCount: shareLink.useCount,
        token: shareLink.token,
    };
};

