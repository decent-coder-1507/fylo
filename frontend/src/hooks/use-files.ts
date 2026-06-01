import { useQuery } from "@tanstack/react-query";
import { getFiles } from "@/services/files.services";

export const useFiles = (folderId?: string) => {
    return useQuery({
        queryKey: ["files", folderId],
        queryFn: () => getFiles(folderId),
    });
};