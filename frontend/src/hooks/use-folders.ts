import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFolders, createFolder, getFolder, deleteFolder } from "@/services/folders.service";

export const useFolders = () => {
    return useQuery({
        queryKey: ["folders"],
        queryFn: getFolders
    });
};

export const useCreateFolder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (name: string) => createFolder(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["folders"] });
        },
    });
};

export const useFolder = (id: string) => {
    return useQuery({
        queryKey: ["folder", id],
        queryFn: () => getFolder(id),
        enabled: !!id,
    });
};

export const useDeleteFolder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteFolder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["folders"] });
        },
    });
};
