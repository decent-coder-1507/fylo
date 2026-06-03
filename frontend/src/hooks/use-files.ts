import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFiles, uploadFile } from "@/services/files.services";

export const useFiles = (folderId?: string) => {
    return useQuery({
        queryKey: ["files", folderId],
        queryFn: async () => {
            const data = await getFiles(folderId);
            return Array.isArray(data) ? data : (data?.files || []);
        },
    });
};

export const useUploadFile = (folderId?: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ file, folderId: fId }: { file: File; folderId: string }) =>
            uploadFile(file, fId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["files", folderId] });
            queryClient.invalidateQueries({ queryKey: ["folders"] });
        },
    });
};