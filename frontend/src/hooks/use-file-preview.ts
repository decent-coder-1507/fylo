import { useQuery } from "@tanstack/react-query";
import { api } from "@/app/lib/axios";

export interface AiProcessingData {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "SKIPPED";
  summary: string | null;
  suggestedTags: string[];
  error: string | null;
  attempts: number;
  maxAttempts: number;
  completedAt: string | null;
  result: {
    summary: string;
    shortSummary: string;
    tags: string[];
    technologies: string[];
    category: string;
    programmingLanguage: string;
  } | null;
}

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
  aiProcessing: AiProcessingData | null;
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
      const isPreviewPending = data?.status === "PENDING" || data?.status === "PROCESSING";
      const isAiPending = data?.aiProcessing?.status === "PENDING" || data?.aiProcessing?.status === "PROCESSING";
      return isPreviewPending || isAiPending ? 2000 : false;
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
