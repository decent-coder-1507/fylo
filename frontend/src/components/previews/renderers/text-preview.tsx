"use client";

import React, { useState } from "react";
import { Copy, Check, WrapText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface TextPreviewProps {
  content: string;
  isTruncated: boolean;
  size?: number;
}

export default function TextPreview({ content, isTruncated }: TextPreviewProps) {
  const [lineWrap, setLineWrap] = useState(true);
  const [copied, setCopied] = useState(false);

  // Split content into lines for line number indexing
  const lines = content.split("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Text copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  return (
    <div className="flex flex-col w-full h-full space-y-3">
      {/* Toolbar */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLineWrap(!lineWrap)}
            className={`h-7 px-2.5 rounded-lg border text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              lineWrap
                ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
            title="Toggle Line Wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>Wrap Text</span>
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 text-[10px] font-medium text-zinc-550 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center gap-1 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Content</span>
            </>
          )}
        </button>
      </div>

      {/* Content panel */}
      <div className="relative w-full h-[55vh] rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/20 overflow-hidden flex font-mono text-[11px] leading-relaxed">
        {/* Line numbers gutter */}
        <div className="select-none text-right pr-3 pl-2 py-3 bg-zinc-100/50 dark:bg-zinc-900/30 border-r border-zinc-200/50 dark:border-zinc-800/40 text-zinc-400 dark:text-zinc-600 min-w-8">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Scrollable code block */}
        <pre 
          className={`flex-1 py-3 px-4 overflow-auto text-zinc-700 dark:text-zinc-300 ${
            lineWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre overflow-x-auto"
          }`}
        >
          {content}
        </pre>
      </div>

      {/* Truncation alert */}
      {isTruncated && (
        <div className="flex gap-2 p-3 rounded-lg bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 text-left">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-normal text-amber-600 dark:text-amber-400">
            This preview is capped at 100KB to ensure fast load times. Download the full file to view the complete content.
          </p>
        </div>
      )}
    </div>
  );
}
