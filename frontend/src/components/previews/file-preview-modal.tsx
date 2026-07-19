"use client";

import React, { useEffect } from "react";
import { X, FileText, Download, Loader2, FileQuestion, Sparkles, Tag, CheckCircle2, AlertTriangle, HelpCircle, Cpu, Send } from "lucide-react";
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
import { sendChatMessage } from "@/services/chat.services";
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

  // Ask Document QA States
  const [fileQuery, setFileQuery] = React.useState("");
  const [fileAnswer, setFileAnswer] = React.useState<string | null>(null);
  const [isAnswering, setIsAnswering] = React.useState(false);

  // Clear states when modal closes or switches files
  useEffect(() => {
    if (!isOpen) {
      setFileQuery("");
      setFileAnswer(null);
      setIsAnswering(false);
    }
  }, [isOpen, fileId]);

  const handleFileQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileQuery.trim()) return;

    setIsAnswering(true);
    setFileAnswer(null);
    try {
      const res = await sendChatMessage(fileQuery, undefined, 3, undefined, fileId);
      setFileAnswer(res.answer);
    } catch (err) {
      console.error(err);
      toast.error("Failed to answer query");
    } finally {
      setIsAnswering(false);
    }
  };

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
          <FileQuestion className="w-12 h-12 text-zinc-400 dark:text-zinc-500 stroke-[1.5]" />
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
        <FileText className="w-12 h-12 text-zinc-400 dark:text-zinc-500 stroke-[1.5]" />
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
              className="h-7 w-7 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
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
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 min-w-0">
              {renderContent()}
            </div>

            {/* AI Insights Sidebar */}
            {metadata && (
              <div className="w-full md:w-64 shrink-0 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800/80 pt-5 md:pt-0 md:pl-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>AI Insights</span>
                </div>

                {metadata.aiProcessing ? (
                  <div className="space-y-4">
                    {/* AI Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-550 dark:text-zinc-450 font-medium">Status:</span>
                      {metadata.aiProcessing.status === "COMPLETED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Enriched
                        </span>
                      )}
                      {metadata.aiProcessing.status === "PROCESSING" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Analyzing...
                        </span>
                      )}
                      {metadata.aiProcessing.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-[10px] font-semibold text-zinc-500">
                          Queued
                        </span>
                      )}
                      {metadata.aiProcessing.status === "FAILED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-semibold text-red-650 dark:text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                      {metadata.aiProcessing.status === "SKIPPED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-[10px] font-semibold text-zinc-400">
                          Skipped
                        </span>
                      )}
                    </div>

                    {/* Category & Programming Language */}
                    {metadata.aiProcessing.status === "COMPLETED" && metadata.aiProcessing.result && (
                      <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10">
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 font-semibold block uppercase tracking-wider text-[9px] mb-0.5">Category</span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{metadata.aiProcessing.result.category}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500 font-semibold block uppercase tracking-wider text-[9px] mb-0.5">Language</span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{metadata.aiProcessing.result.programmingLanguage}</span>
                        </div>
                      </div>
                    )}

                    {/* AI Summary */}
                    {metadata.aiProcessing.status === "COMPLETED" && (metadata.aiProcessing.summary || metadata.aiProcessing.result?.summary) && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Summary</span>
                        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                          {metadata.aiProcessing.result?.summary || metadata.aiProcessing.summary}
                        </div>
                      </div>
                    )}

                    {/* Technologies */}
                    {metadata.aiProcessing.status === "COMPLETED" && metadata.aiProcessing.result?.technologies && metadata.aiProcessing.result.technologies.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu className="w-3 h-3 text-indigo-500" />
                          Technologies
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {metadata.aiProcessing.result.technologies.map((tech) => (
                            <span
                              key={tech}
                              className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-medium text-indigo-650 dark:text-indigo-400"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Tags */}
                    {metadata.aiProcessing.status === "COMPLETED" && ((metadata.aiProcessing.suggestedTags && metadata.aiProcessing.suggestedTags.length > 0) || (metadata.aiProcessing.result?.tags && metadata.aiProcessing.result.tags.length > 0)) && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-emerald-500" />
                          Suggested Tags
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(metadata.aiProcessing.result?.tags || metadata.aiProcessing.suggestedTags).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ask this Document (RAG QA) */}
                    {metadata.aiProcessing.status === "COMPLETED" && (
                      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-900/60 space-y-2">
                        <span className="text-[11px] font-semibold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-blue-500" />
                          Ask this Document
                        </span>
                        <form onSubmit={handleFileQuery} className="relative">
                          <input
                            type="text"
                            value={fileQuery}
                            onChange={(e) => setFileQuery(e.target.value)}
                            disabled={isAnswering}
                            placeholder="Ask a question about this file..."
                            className="w-full h-8 pl-2 pr-8 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[10px] text-zinc-800 dark:text-zinc-200 placeholder-zinc-450 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="submit"
                            disabled={isAnswering || !fileQuery.trim()}
                            className="absolute right-1 top-1 w-6 h-6 rounded flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer disabled:opacity-30"
                          >
                            {isAnswering ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          </button>
                        </form>
                        {fileAnswer && (
                          <div className="p-3 rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/20 text-[10px] text-zinc-700 dark:text-zinc-200 leading-relaxed font-sans max-h-40 overflow-y-auto">
                            <strong>AI:</strong> {fileAnswer}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error message */}
                    {metadata.aiProcessing.status === "FAILED" && metadata.aiProcessing.error && (
                      <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-500/[0.02] text-xs text-red-650 dark:text-red-400 leading-normal">
                        {metadata.aiProcessing.error}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-400 dark:text-zinc-500">
                    <HelpCircle className="w-8 h-8 stroke-[1.5] mb-2" />
                    <span className="text-xs font-semibold">Not Processed</span>
                    <span className="text-[10px] max-w-[150px] mt-1 leading-normal">No AI processing history found for this file.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
