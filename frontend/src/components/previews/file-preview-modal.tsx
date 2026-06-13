"use client";

import React, { useEffect } from "react";
import { X, FileText, Download, Loader2, FileQuestion } from "lucide-react";
import { useFilePreview } from "@/hooks/use-file-preview";
import PreviewLoadingState from "./preview-loading-state";
import PreviewErrorState from "./preview-error-state";
import ImagePreview from "./renderers/image-preview";
import PdfPreview from "./renderers/pdf-preview";
import TextPreview from "./renderers/text-preview";
import MarkdownPreview from "./renderers/markdown-preview";
import JsonPreview from "./renderers/json-preview";
import CodePreview from "./renderers/code-preview";
import { downloadFile } from "@/services/files.services";
import { toast } from "sonner";
import { api } from "@/app/lib/axios";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  fileSize?: number;
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  fileSize,
}: FilePreviewModalProps) {
  const {
    metadata,
    isLoadingMetadata,
    isPolling,
    content,
    isLoadingContent,
    error,
    refetch,
  } = useFilePreview(fileId, isOpen);

  // Esc key close handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    toast.info(`Downloading "${fileName}"...`);
    try {
      const blob = await downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Successfully downloaded "${fileName}"!`);
    } catch {
      toast.error(`Failed to download "${fileName}"`);
    }
  };

  // Helper to format bytes to human-readable size
  const formatBytes = (bytes?: number, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Helper to detect if file is previewable as an image
  const getIsImage = () => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    return ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext);
  };

  // Helper to detect if file is a PDF
  const getIsPdf = () => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    return ext === "pdf";
  };

  const renderContent = () => {
    if (error) {
      return <PreviewErrorState error={error} onRetry={() => refetch()} />;
    }

    if (isLoadingMetadata || (metadata && (metadata.status === "PENDING" || metadata.status === "PROCESSING"))) {
      const status: "PENDING" | "PROCESSING" | "LOADING" =
        isLoadingMetadata ? "LOADING" : (metadata!.status as "PENDING" | "PROCESSING");
      return <PreviewLoadingState status={status} attempts={metadata?.attempts} />;
    }

    if (metadata?.status === "SKIPPED") {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
          <FileQuestion className="w-12 h-12 text-zinc-400 dark:text-zinc-650 stroke-[1.5]" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Preview skipped
            </h4>
            <p className="text-xs text-zinc-500 max-w-xs leading-normal">
              This file was skipped because it exceeds size limits or is not a supported format.
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Download to View
          </button>
        </div>
      );
    }

    if (metadata?.status === "COMPLETED") {
      // 1. Image Render
      if (getIsImage() && metadata.previewUrl) {
        return (
          <ImagePreview
            url={metadata.previewUrl}
            name={fileName}
            metadata={metadata.metadata}
          />
        );
      }

      // 2. PDF Render
      if (getIsPdf() && metadata.previewUrl) {
        const fullPdfUrl = `${api.defaults.baseURL}/files/${fileId}/download?inline=true`;
        return (
          <PdfPreview
            previewUrl={metadata.previewUrl}
            fullPdfUrl={fullPdfUrl}
            name={fileName}
          />
        );
      }

      // 3. Text/Code/Markdown/JSON Render
      if (isLoadingContent) {
        return (
          <div className="flex flex-col items-center justify-center py-16 px-6 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400 dark:text-zinc-600" />
            <span className="text-xs text-zinc-500 font-medium">Loading content...</span>
          </div>
        );
      }

      if (content) {
        switch (content.type) {
          case "markdown":
            return <MarkdownPreview content={content.content} isTruncated={content.isTruncated} />;
          case "json":
            return <JsonPreview content={content.content} />;
          case "code":
            return <CodePreview content={content.content} language={content.language} isTruncated={content.isTruncated} />;
          default:
            return <TextPreview content={content.content} isTruncated={content.isTruncated} size={content.size} />;
        }
      }
    }

    // Default Fallback
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
        <FileText className="w-12 h-12 text-zinc-400 dark:text-zinc-650 stroke-[1.5]" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            No preview available
          </h4>
          <p className="text-xs text-zinc-500 max-w-xs leading-normal">
            We don't support inline previews for this file extension yet.
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Main modal container */}
      <div className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl transition-all duration-300 transform scale-100 glass-panel flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate pr-4" title={fileName}>
                {fileName}
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                {formatBytes(fileSize)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Direct download button inside header */}
            <button
              onClick={handleDownload}
              className="h-7 w-7 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              title="Download original file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            
            {/* Close modal button */}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Viewport Body */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[40vh]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
