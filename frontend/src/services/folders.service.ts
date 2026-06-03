import { api } from "@/app/lib/axios";

export const getFolders = async () => {
    const res = await api.get("/folders");
    return res.data;
};

export const createFolder = async (name: string) => {
    const res = await api.post("/folders", {
        name,
    });

    return res.data;
};

export const getFolder = async (id: string) => {
    const res = await api.get(`/folders/${id}`);
    return res.data;
};

export const deleteFolder = async (id: string) => {
    const res = await api.delete(`/folders/${id}`);
    return res.data;
};