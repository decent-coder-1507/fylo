"use client";

import React, { useState } from "react";
import Sidebar from "@/components/sidebar";
import { useFolders } from "@/hooks/use-folders";
import { useFiles } from "@/hooks/use-files";
import { useAuth } from "@/hooks/use-auth";
import TelegramConnect from "@/components/telegram-connect";
import FolderGrid from "@/components/folder-grid";
import CreateFolderDialog from "@/components/create-folder-dialog";
import { DashboardHeaderSkeleton, GridSkeleton, FileListSkeleton } from "@/components/loading-skeleton";
import FileList from "@/components/file-list";
import { Folder, Files, Cloud, Plus, Sparkles } from "lucide-react";

export default function Dashboard() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Auth Query
  const { data: auth, isLoading: isAuthLoading } = useAuth();

  // Queries
  const { data: folders, isLoading: isFoldersLoading } = useFolders();
  const { data: files, isLoading: isFilesLoading } = useFiles();

  const totalFolders = folders?.length || 0;
  const totalFiles = files?.length || 0;

  // Calculate total size of files safely
  const totalSize = React.useMemo(() => {
    if (!files) return 0;
    return files.reduce((acc: number, file: any) => acc + (file.size || 0), 0);
  }, [files]);

  // Format Bytes for overall storage representation
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Extract recent 5 files
  const recentFiles = React.useMemo(() => {
    if (!files) return [];
    return [...files]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [files]);

  const isLoading = isFoldersLoading || isFilesLoading;

  return (
    <Sidebar>
      <div className="space-y-8 relative">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/[0.02] dark:bg-blue-500/5 rounded-full filter blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-900/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-zinc-50 dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
                Storage Hub
              </h1>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                Beta
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Store, organize, and retrieve files at your personal cloud.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="self-start sm:self-auto h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-black/10 hover:shadow-black/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            New Folder
          </button>
        </div>

        {isLoading ? (
          <DashboardHeaderSkeleton />
        ) : (
          /* Stats Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stat Card 1: Total Folders */}
            <div className="relative overflow-hidden p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/10 backdrop-blur-sm group hover:border-zinc-300 dark:hover:border-zinc-700/60 transition-all duration-300">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Folders</span>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                  <Folder className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3.5">
                <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{totalFolders}</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium block mt-0.5">
                  Virtual directories
                </span>
              </div>
            </div>

            {/* Stat Card 2: Total Files */}
            <div className="relative overflow-hidden p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/10 backdrop-blur-sm group hover:border-zinc-300 dark:hover:border-zinc-700/60 transition-all duration-300">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Files</span>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                  <Files className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3.5">
                <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{totalFiles}</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium block mt-0.5">
                  Stored in {totalFolders} folders
                </span>
              </div>
            </div>

            {/* Stat Card 3: Storage Used */}
            <div className="relative overflow-hidden p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/10 backdrop-blur-sm group hover:border-zinc-300 dark:hover:border-zinc-700/60 transition-all duration-300">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Storage Footprint</span>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                  <Cloud className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3.5">
                <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {formatBytes(totalSize)}
                </span>
                <span className="text-[10px] text-zinc-550 dark:text-zinc-500 font-medium block mt-0.5">
                  Unlimited network quota
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Folders Explorer Block */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" />
              Folders Explorer
            </h2>
          </div>

          {isFoldersLoading ? (
            <GridSkeleton count={3} />
          ) : (
            <FolderGrid folders={folders || []} onCreateClick={() => setIsCreateOpen(true)} />
          )}
        </section>

        {/* Recent Files Table Block */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Files className="w-3.5 h-3.5" />
              Recent Uploads
            </h2>
          </div>

          {isFilesLoading ? (
            <FileListSkeleton count={3} />
          ) : (
            <FileList files={recentFiles} />
          )}
        </section>

        {/* Create Folder Dialog Modal */}
        <CreateFolderDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      </div>
    </Sidebar>
  );
}
