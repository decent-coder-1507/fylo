"use client";

import React from "react";
import FolderCard from "./folder-card";
import { Folder } from "@/types/folder.types";
import EmptyState from "./empty-state";
import { FolderOpen, Plus } from "lucide-react";

interface FolderGridProps {
  folders: Folder[];
  onCreateClick?: () => void;
}

export default function FolderGrid({ folders, onCreateClick }: FolderGridProps) {
  if (!folders || folders.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No Folders Yet"
        description="Create your first folder to start organizing and storing files on Telegram."
        actionButton={
          onCreateClick ? (
            <button
              onClick={onCreateClick}
              className="h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Folder
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {folders.map((folder) => (
        <FolderCard key={folder.id} folder={folder} />
      ))}
    </div>
  );
}
