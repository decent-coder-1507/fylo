"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { useFolder, useDeleteFolder } from "@/hooks/use-folders";
import { useFiles } from "@/hooks/use-files";
import UploadDropzone from "@/components/upload-dropzone";
import FileList from "@/components/file-list";
import { FileListSkeleton } from "@/components/loading-skeleton";
import {
  ChevronLeft,
  Folder,
  Trash2,
  Calendar,
  Layers,
  Loader2,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface FolderDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function FolderDetailsPage({ params }: FolderDetailsPageProps) {
  const router = useRouter();
  const { id } = React.use(params);

  // State for delete modal or state confirmation
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries
  const { data: folder, isLoading: isFolderLoading, error: folderError } = useFolder(id);
  const { data: files, isLoading: isFilesLoading } = useFiles(id);
  const { mutate: deleteFolder } = useDeleteFolder();

  const fileCount = files?.length || 0;

  // Format Bytes for overall size of this folder
  const folderSize = React.useMemo(() => {
    if (!files) return 0;
    return files.reduce((acc: number, file: any) => acc + (file.size || 0), 0);
  }, [files]);

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown Date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unknown Date";
    }
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        `Are you sure you want to delete folder "${folder?.name}"? All files inside this folder and its backing Telegram channel will be permanently deleted.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    deleteFolder(id, {
      onSuccess: () => {
        toast.success(`Folder "${folder?.name}" deleted successfully.`);
        router.push("/");
      },
      onError: (error: any) => {
        setIsDeleting(false);
        const errorMsg = error.response?.data?.message || "Failed to delete folder";
        toast.error(errorMsg);
      },
    });
  };

  if (isFolderLoading) {
    return (
      <Sidebar>
        <div className="space-y-6">
          <div className="w-32 h-6 rounded shimmer-bg" />
          <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl shimmer-bg h-48" />
          <FileListSkeleton count={4} />
        </div>
      </Sidebar>
    );
  }

  if (folderError || !folder) {
    return (
      <Sidebar>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Folder Not Found</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            The folder you are looking for does not exist, or has been deleted.
          </p>
          <Link
            href="/dashboard"
            className="h-9 px-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 hover:dark:text-zinc-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="space-y-8 relative">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-900/60">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-all shrink-0 cursor-pointer"
              title="Back to Dashboard"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              <Link href="/dashboard" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-zinc-800 dark:text-zinc-200 line-clamp-1 max-w-[120px] sm:max-w-none">
                {folder.name}
              </span>
            </div>
          </div>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-8 px-3 rounded-lg border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Delete Folder
          </button>
        </div>

        {/* Folder Info Header Card */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/10 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-50/[0.01] rounded-full filter blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-blue-500 dark:text-blue-400 shrink-0 shadow-lg">
                <Folder className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {folder.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    Created: {formatDate(folder.createdAt)}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 px-1.5 py-0.5 rounded">
                    TG ID: {folder.telegramId}
                  </span>
                </div>
              </div>
            </div>

            {/* Folder Metrics */}
            <div className="flex gap-6 self-stretch sm:self-auto justify-between sm:justify-start pt-4 sm:pt-0 border-t sm:border-t-0 border-zinc-200 dark:border-zinc-800/60 font-mono">
              <div className="space-y-0.5 sm:text-right">
                <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Total Size
                </div>
                <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{formatBytes(folderSize)}</div>
              </div>
              <div className="space-y-0.5 sm:text-right border-l sm:border-l border-zinc-200 dark:border-zinc-800/60 pl-6">
                <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Total Files
                </div>
                <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{fileCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Dropzone Container */}
        <section className="space-y-4">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            Upload File
          </div>
          <UploadDropzone folderId={id} />
        </section>

        {/* Files Listing Explorer */}
        <section className="space-y-4 pt-4">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            Files Explorer
          </div>
          {isFilesLoading ? (
            <FileListSkeleton count={4} />
          ) : (
            <FileList files={files || []} folderName={folder.name} />
          )}
        </section>
      </div>
    </Sidebar>
  );
}
