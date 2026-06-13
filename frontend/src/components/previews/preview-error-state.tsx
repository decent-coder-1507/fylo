"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface PreviewErrorStateProps {
  error: any;
  onRetry: () => void;
}

export default function PreviewErrorState({
  error,
  onRetry,
}: PreviewErrorStateProps) {
  const errorMsg =
    typeof error === "string"
      ? error
      : error?.response?.data?.error || error?.message || "An unexpected error occurred during preview generation";

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500">
        <AlertCircle className="w-6 h-6 stroke-[1.5]" />
      </div>

      <div className="space-y-2 max-w-md">
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Preview generation failed
        </h4>
        <div className="p-3 rounded-lg border border-red-200/50 dark:border-red-900/30 bg-red-500/5 text-[11px] font-mono text-red-650 dark:text-red-400 break-all leading-normal text-left max-h-40 overflow-y-auto">
          {errorMsg}
        </div>
      </div>

      <button
        onClick={onRetry}
        className="h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry Generation
      </button>
    </div>
  );
}
