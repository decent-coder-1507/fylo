"use client";

import React, { useState } from "react";
import { ExternalLink, Loader2, FileText } from "lucide-react";

interface PdfPreviewProps {
  previewUrl: string;
  fullPdfUrl: string;
  name: string;
}

export default function PdfPreview({ previewUrl, fullPdfUrl, name }: PdfPreviewProps) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex flex-col w-full h-full space-y-3">
      {/* Top Banner actions */}
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] text-zinc-400 font-mono">
          PDF Document Preview (First Page)
        </span>
        <a
          href={fullPdfUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
        >
          Open Full Document
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* PDF Image Preview wrapper */}
      <div className="relative w-full h-[60vh] rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-950/20 overflow-auto shadow-inner flex justify-center items-start p-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950/80 z-10 space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400 dark:text-zinc-600" />
            <span className="text-xs text-zinc-500 font-medium">Loading preview...</span>
          </div>
        )}
        <img
          src={previewUrl}
          alt={name}
          onLoad={() => setLoading(false)}
          className="max-h-full max-w-full object-contain rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-md transition-opacity duration-300"
          style={{ opacity: loading ? 0 : 1 }}
        />
      </div>

      {/* Browser native fallback prompt */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-900 text-left">
        <FileText className="w-4 h-4 text-zinc-400 dark:text-zinc-600 shrink-0" />
        <p className="text-[10px] leading-normal text-zinc-500 dark:text-zinc-400">
          Viewing first-page preview. To read, search, or print the full multi-page document, please click <strong>Open Full Document</strong>.
        </p>
      </div>
    </div>
  );
}
