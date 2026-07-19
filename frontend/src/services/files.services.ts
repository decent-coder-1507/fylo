import { api } from "@/app/lib/axios";

export const getFiles = async (folderId?: string) => {
    const res = await api.get("/files", {
        params: {
            folderId,
        },
    });
    return res.data;
};

export const uploadFile = async (
    file: File,
    folderId: string
) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderId", folderId);
    const res = await api.post(
        "/files/upload",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );
    return res.data;
};

export const downloadFile = async (fileId: string) => {
    const res = await api.get(`/files/${fileId}/download`, {
        responseType: "blob",
    });
    return res.data;
};

export const createShareLink = async (
    fileId: string,
    expiresInHours?: number,
    maxUses?: number
) => {
    const res = await api.post("/share", {
        fileId,
        expiresInHours,
        maxUses,
    });
    return res.data;
};

export const searchFiles = async (
    query: string,
    mode: "semantic" | "keyword" | "hybrid" = "semantic",
    folderId?: string,
    limit?: number,
    minScore?: number
) => {
    const res = await api.get("/files/search", {
        params: {
            query,
            mode,
            folderId,
            limit,
            minScore,
        },
    });
    return res.data;
};

