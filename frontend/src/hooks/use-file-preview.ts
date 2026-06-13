import { useQuery } from "@tanstack/react-query";
import { api } from "@/app/lib/axios";

export interface PreviewMetadataResponse {
  id: string;
  fileId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "SKIPPED";
  thumbnailUrl: string | null;
  previewUrl: string | null;
  metadata: Record<string, any> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
}

export interface TextPreviewResponse {
  type: "text" | "markdown" | "json" | "code";
  language: string;
  content: string;
  isTruncated: boolean;
  size: number;
}

export function useFilePreview(fileId: string, isOpen: boolean) {
  const metadataQuery = useQuery<PreviewMetadataResponse>({
    queryKey: ["file-preview", fileId],
    queryFn: async () => {
      const res = await api.get(`/files/${fileId}/preview`);
      return res.data;
    },
    enabled: isOpen && !!fileId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 2 seconds if status is PENDING or PROCESSING
      return data?.status === "PENDING" || data?.status === "PROCESSING" ? 2000 : false;
    },
  });

  const status = metadataQuery.data?.status;
  // If preview is COMPLETED and previewUrl is null, it's a text-based preview (retrieved as JSON payload)
  const isTextBased =
    status === "COMPLETED" &&
    metadataQuery.data?.previewUrl === null;

  const contentQuery = useQuery<TextPreviewResponse>({
    queryKey: ["file-preview-content", fileId],
    queryFn: async () => {
      const res = await api.get(`/files/${fileId}/preview/content`);
      return res.data;
    },
    enabled: isOpen && !!fileId && isTextBased,
    staleTime: Infinity,
  });

  return {
    metadata: metadataQuery.data,
    isLoadingMetadata: metadataQuery.isLoading,
    isPolling: status === "PENDING" || status === "PROCESSING",
    content: contentQuery.data,
    isLoadingContent: contentQuery.isLoading,
    error: metadataQuery.error || contentQuery.error || metadataQuery.data?.error || null,
    refetch: metadataQuery.refetch,
  };
}
