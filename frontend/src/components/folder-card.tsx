"use client";

import React from "react";
import Link from "next/link";
import { Folder as FolderIcon, FileText, ChevronRight, Calendar } from "lucide-react";
import { Folder } from "@/types/folder.types";

interface FolderCardProps {
  folder: Folder;
}

export default function FolderCard({ folder }: FolderCardProps) {
  const fileCount = folder._count?.files ?? 0;

  // Format date nicely
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unknown Date";
    }
  };

  return (
    <Link
      href={`/folders/${folder.id}`}
      className="group relative block rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/20 p-5 glass-panel glass-panel-hover"
    >
      <div className="flex justify-between items-start">
        {/* Folder Icon container with dynamic hover glow */}
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:border-blue-500/20 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all duration-300">
          <FolderIcon className="w-5 h-5 stroke-[1.5]" />
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 group-hover:dark:text-zinc-400 group-hover:translate-x-0.5 transition-all duration-200" />
      </div>

      <div className="mt-4 space-y-1.5">
        <h3 className="font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-950 group-hover:dark:text-zinc-50 transition-colors line-clamp-1">
          {folder.name}
        </h3>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono line-clamp-1">
          TG ID: {folder.telegramId}
        </p>
      </div>

      {/* Footer statistics */}
      <div className="mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800/50 flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-500">
        <div className="flex items-center gap-1.5 font-medium">
          <FileText className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <Calendar className="w-3 h-3 stroke-[1.5]" />
          <span>{formatDate(folder.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
