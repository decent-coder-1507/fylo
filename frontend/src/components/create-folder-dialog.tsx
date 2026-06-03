"use client";

import React, { useState, useEffect, useRef } from "react";
import { useCreateFolder } from "@/hooks/use-folders";
import { toast } from "sonner";
import { FolderPlus, X, Loader2 } from "lucide-react";

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateFolderDialog({
  isOpen,
  onClose,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: createFolder, isPending } = useCreateFolder();

  // Handle focus when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFolderName("");
      // Subtle delay to allow overlay animation to finish
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = folderName.trim();
    if (!trimmedName) {
      toast.error("Folder name cannot be empty");
      return;
    }

    createFolder(trimmedName, {
      onSuccess: () => {
        toast.success(`Folder "${trimmedName}" created successfully!`);
        onClose();
      },
      onError: (error: any) => {
        const errorMsg = error.response?.data?.message || "Failed to create folder";
        toast.error(errorMsg);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog box */}
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all duration-300 transform scale-100 glass-panel">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">New Folder</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Organize your Telegram storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="folder-name"
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              Folder Name
            </label>
            <input
              ref={inputRef}
              id="folder-name"
              type="text"
              placeholder="e.g. Documents, Backup Files, Images"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              disabled={isPending}
              maxLength={50}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none ring-zinc-300 dark:ring-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-700 focus:ring-1 focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-9 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !folderName.trim()}
              className="h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:hover:bg-zinc-900 dark:disabled:hover:bg-zinc-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
