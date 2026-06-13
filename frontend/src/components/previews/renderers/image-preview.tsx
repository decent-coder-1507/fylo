"use client";

import React, { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Loader2 } from "lucide-react";

interface ImagePreviewProps {
  url: string;
  name: string;
  metadata?: Record<string, any> | null;
}

export default function ImagePreview({ url, name, metadata }: ImagePreviewProps) {
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => setScale(1);

  // Retrieve dimensions if provided in metadata
  const dimensions = metadata?.width && metadata?.height 
    ? `${metadata.width} × ${metadata.height}px` 
    : null;

  return (
    <div className="flex flex-col items-center w-full h-full relative space-y-4">
      {/* Zoom Toolbar */}
      <div className="flex items-center gap-1 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/40 backdrop-blur-sm z-10">
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono font-semibold px-2 text-zinc-500">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
        <button
          onClick={handleReset}
          className="p-1.5 rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Image Viewport Container */}
      <div className="relative w-full h-[60vh] rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-950/20 overflow-hidden flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400 dark:text-zinc-600" />
          </div>
        )}
        
        {/* Styled preview image container with zoom transitions */}
        <div 
          className="transition-transform duration-200 ease-out max-w-full max-h-full p-4 flex items-center justify-center"
          style={{ transform: `scale(${scale})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={name}
            onLoad={() => setLoading(false)}
            className="object-contain max-h-[50vh] rounded-lg shadow-md select-none pointer-events-none"
          />
        </div>
      </div>

      {dimensions && (
        <span className="text-[10px] text-zinc-400 font-mono">
          Resolution: {dimensions}
        </span>
      )}
    </div>
  );
}
