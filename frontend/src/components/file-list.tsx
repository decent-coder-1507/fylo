"use client";

import React, { useState, useMemo } from "react";
import { FileItem } from "@/types/file.types";
import { downloadFile } from "@/services/files.services";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Download,
  Calendar,
  Layers,
  Search,
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  Loader2,
  Share2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import EmptyState from "./empty-state";
import ShareLinkModal from "./share-link-modal";
import FilePreviewModal from "./previews/file-preview-modal";

interface FileListProps {
  files: FileItem[];
  folderName?: string;
}

// Helper to format bytes to human-readable size
const formatBytes = (bytes?: number, decimals = 2) => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return "0 Bytes";
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// Helper to get file icon and Tailwind color styles based on extension
const getFileMeta = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  switch (ext) {
    case "pdf":
      return {
        icon: FileText,
        color: "text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20",
        label: "PDF Document",
      };
    case "doc":
    case "docx":
    case "txt":
    case "rtf":
    case "md":
      return {
        icon: FileText,
        color: "text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
        label: "Document",
      };
    case "xls":
    case "xlsx":
    case "csv":
      return {
        icon: FileText,
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        label: "Spreadsheet",
      };
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return {
        icon: ImageIcon,
        color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
        label: "Image File",
      };
    case "mp4":
    case "mov":
    case "avi":
    case "mkv":
    case "webm":
      return {
        icon: Video,
        color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
        label: "Video File",
      };
    case "mp3":
    case "wav":
    case "ogg":
    case "m4a":
    case "flac":
      return {
        icon: Music,
        color: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
        label: "Audio File",
      };
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return {
        icon: Archive,
        color: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
        label: "Archive File",
      };
    default:
      return {
        icon: FileText,
        color: "text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
        label: "File",
      };
  }
};

export default function FileList({ files, folderName }: FileListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "size" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<{ id: string; name: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Filter & Sort logic
  const filteredAndSortedFiles = useMemo(() => {
    let result = files.filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "size") {
        const sizeA = a.size || 0;
        const sizeB = b.size || 0;
        comparison = sizeA - sizeB;
      } else if (sortBy === "date") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [files, searchQuery, sortBy, sortOrder]);

  // Format Date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown Date";
    }
  };

  const handleDownload = async (file: FileItem) => {
    setDownloadingId(file.id);
    toast.info(`Downloading "${file.name}" from Telegram...`);

    try {
      const blob = await downloadFile(file.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Successfully downloaded "${file.name}"!`);
    } catch (err) {
      console.error("Download error:", err);
      toast.error(`Failed to download "${file.name}"`);
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleSort = (field: "name" | "size" | "date") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  if (!files || files.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Folder is Empty"
        description="There are no files uploaded to this folder yet. Drag and drop files above to start storing!"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-zinc-400 focus:dark:border-zinc-700 focus:bg-white focus:dark:bg-zinc-900/70 transition-all"
          />
        </div>

        {/* Sorting Toggles */}
        <div className="flex items-center gap-2 self-end sm:self-auto font-medium">
          <button
            onClick={() => toggleSort("date")}
            className={`h-8 px-3 rounded-lg border text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              sortBy === "date"
                ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 font-semibold"
                : "border-zinc-200 dark:border-zinc-800/80 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 bg-white/40 dark:bg-transparent"
            }`}
          >
            <span>Date</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => toggleSort("name")}
            className={`h-8 px-3 rounded-lg border text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              sortBy === "name"
                ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 font-semibold"
                : "border-zinc-200 dark:border-zinc-800/80 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 bg-white/40 dark:bg-transparent"
            }`}
          >
            <span>Name</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => toggleSort("size")}
            className={`h-8 px-3 rounded-lg border text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              sortBy === "size"
                ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 font-semibold"
                : "border-zinc-200 dark:border-zinc-800/80 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 bg-white/40 dark:bg-transparent"
            }`}
          >
            <span>Size</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* File List Table Container */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/30 dark:bg-zinc-900/10 overflow-hidden backdrop-blur-sm">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 py-3 px-4 border-b border-zinc-200 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-950/40 text-[11px] font-medium text-zinc-500 dark:text-zinc-500 tracking-wider">
          <div className="col-span-7">NAME</div>
          <div className="col-span-2 text-right">SIZE</div>
          <div className="col-span-2 text-right">CREATED AT</div>
          <div className="col-span-1 text-right">ACTION</div>
        </div>

        {filteredAndSortedFiles.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No files matched your search. Try another query.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {filteredAndSortedFiles.map((file) => {
              const meta = getFileMeta(file.name);
              const FileIcon = meta.icon;
              const isThisDownloading = downloadingId === file.id;

              return (
                <div
                  key={file.id}
                  className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 py-3.5 px-4 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 transition-colors group items-center"
                >
                  {/* File icon & name */}
                  <div className="flex items-center gap-3 col-span-12 sm:col-span-7 min-w-0">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all shrink-0 ${meta.color}`}
                    >
                      <FileIcon className="w-4 h-4 stroke-[1.5]" />
                    </div>
                    <div className="overflow-hidden space-y-0.5 min-w-0">
                      <span
                        onClick={() => setPreviewFile(file)}
                        className="text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 hover:dark:text-zinc-50 hover:underline cursor-pointer transition-colors line-clamp-1 break-all"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono block sm:hidden">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                  </div>

                  {/* Size (desktop only) */}
                  <div className="col-span-2 text-right text-xs text-zinc-600 dark:text-zinc-400 font-mono hidden sm:block">
                    {formatBytes(file.size)}
                  </div>

                  {/* Date (desktop only) */}
                  <div className="col-span-2 text-right text-[11px] text-zinc-500 dark:text-zinc-500 font-mono hidden sm:block whitespace-nowrap">
                    {formatDate(file.createdAt)}
                  </div>

                  {/* Action download & share buttons */}
                  <div className="col-span-1 flex justify-end gap-1.5">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-all cursor-pointer"
                      title="Preview file"
                    >
                      <Eye className="w-3.5 h-3.5 stroke-[1.5]" />
                    </button>
                    <button
                      onClick={() => setShareFile({ id: file.id, name: file.name })}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-all cursor-pointer"
                      title="Share file"
                    >
                      <Share2 className="w-3.5 h-3.5 stroke-[1.5]" />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={isThisDownloading}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-all disabled:opacity-50 cursor-pointer"
                      title="Download file"
                    >
                      {isThisDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 stroke-[1.5]" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
        fileId={shareFile?.id || ""}
        fileName={shareFile?.name || ""}
      />

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileId={previewFile.id}
          fileName={previewFile.name}
          fileSize={previewFile.size}
        />
      )}
    </div>
  );
}
