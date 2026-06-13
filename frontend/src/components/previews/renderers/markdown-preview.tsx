"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, Eye, Code, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface MarkdownPreviewProps {
  content: string;
  isTruncated: boolean;
}

export default function MarkdownPreview({ content, isTruncated }: MarkdownPreviewProps) {
  const [activeTab, setActiveTab] = useState<"formatted" | "raw">("formatted");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Markdown copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy content");
    }
  };

  return (
    <div className="flex flex-col w-full h-full space-y-3">
      {/* Tab bar and actions */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-1.5 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20">
          <button
            onClick={() => setActiveTab("formatted")}
            className={`h-7 px-3 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "formatted"
                ? "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 font-semibold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Formatted</span>
          </button>
          <button
            onClick={() => setActiveTab("raw")}
            className={`h-7 px-3 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "raw"
                ? "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 font-semibold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Raw Source</span>
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center gap-1 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Markdown</span>
            </>
          )}
        </button>
      </div>

      {/* Preview box */}
      <div className="w-full h-[55vh] rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-950/20 overflow-y-auto p-5 text-left text-xs">
        {activeTab === "raw" ? (
          <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-zinc-700 dark:text-zinc-300">
            {content}
          </pre>
        ) : (
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300 leading-relaxed max-w-none break-words">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold border-b border-zinc-200 dark:border-zinc-800/80 pb-1.5 mt-5 mb-3 text-zinc-900 dark:text-zinc-100">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-semibold mt-4 mb-2 text-zinc-800 dark:text-zinc-100">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xs font-semibold mt-3.5 mb-1.5 text-zinc-800 dark:text-zinc-200">
                    {children}
                  </h3>
                ),
                p: ({ children }) => <p className="mb-3 text-zinc-700 dark:text-zinc-300 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-zinc-700 dark:text-zinc-300">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-3 py-1 my-3 text-zinc-500 italic bg-zinc-100/50 dark:bg-zinc-900/40 rounded-r-md">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="font-mono text-[10px] bg-zinc-200/60 dark:bg-zinc-800/80 px-1 py-0.5 rounded text-zinc-800 dark:text-zinc-200">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="font-mono text-[10.5px] bg-zinc-100 dark:bg-zinc-900/60 p-3.5 rounded-lg overflow-x-auto border border-zinc-200 dark:border-zinc-800 my-3 text-zinc-800 dark:text-zinc-300">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-4 border-t border-zinc-200 dark:border-zinc-800" />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Truncation alert */}
      {isTruncated && (
        <div className="flex gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-left">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-normal text-amber-600 dark:text-amber-400">
            This preview is capped at 100KB to ensure fast load times. Download the full file to view the complete content.
          </p>
        </div>
      )}
    </div>
  );
}
