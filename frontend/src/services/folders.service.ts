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