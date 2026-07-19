"use client";

import React from "react";
import { Loader2, Info } from "lucide-react";

interface PreviewLoadingStateProps {
  status: "PENDING" | "PROCESSING" | "LOADING";
  attempts?: number;
}

export default function PreviewLoadingState({
  status,
  attempts = 0,
}: PreviewLoadingStateProps) {
  const getMessage = () => {
    switch (status) {
      case "PENDING":
        return {
          title: "File queued for preview",
          description: "We are queuing this file for processing. It will be downloaded from Telegram shortly.",
        };
      case "PROCESSING":
        return {
          title: "Generating preview...",
          description: `Downloading from Telegram and generating assets. (Attempt ${attempts + 1})`,
        };
      default:
        return {
          title: "Loading metadata...",
          description: "Fetching file information and status.",
        };
    }
  };

  const message = getMessage();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-5 animate-in fade-in duration-300">
      {/* Premium glowing spinner */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-12 h-12 rounded-full border-4 border-zinc-100 dark:border-zinc-900" />
        <Loader2 className="w-12 h-12 text-zinc-700 dark:text-zinc-300 animate-spin stroke-[1.5]" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {message.title}
        </h4>
        <p className="text-xs text-zinc-500 leading-relaxed">
          {message.description}
        </p>
      </div>

      {status === "PROCESSING" && (
        <div className="flex gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-900 max-w-xs text-left">
          <Info className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-normal text-zinc-500 dark:text-zinc-400">
            For larger files, it may take several seconds to transcode or read the data.
          </p>
        </div>
      )}
    </div>
  );
}
