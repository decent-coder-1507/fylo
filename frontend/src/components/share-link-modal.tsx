"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, ExternalLink, Globe, Calendar, RefreshCw, AlertCircle } from "lucide-react";
import { createShareLink } from "@/services/files.services";
import { toast } from "sonner";

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

export default function ShareLinkModal({
  isOpen,
  onClose,
  fileId,
  fileName,
}: ShareLinkModalProps) {
  const [expiryHours, setExpiryHours] = useState<number>(168); // 7 days default
  const [maxUses, setMaxUses] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Generate share link on mount/open
  useEffect(() => {
    if (isOpen && fileId) {
      handleGenerate();
    } else {
      // Reset state on close
      setShareUrl("");
      setCopied(false);
      setMaxUses("");
      setExpiryHours(168);
    }
  }, [isOpen, fileId]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const uses = maxUses ? parseInt(maxUses) : undefined;
      const data = await createShareLink(fileId, expiryHours, uses);
      setShareUrl(data.shareUrl);
      setCopied(false);
      toast.success("Share link generated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate share link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Copied share link to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-150 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <Globe className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-150">
                Share Link
              </h3>
              <p className="text-[10px] text-zinc-500 line-clamp-1 max-w-[240px]" title={fileName}>
                {fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-450 dark:text-zinc-550 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* Share link input & action */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Public Link
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={isLoading ? "Generating..." : shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs text-zinc-700 dark:text-zinc-300 outline-none select-all truncate font-mono"
                />
                <Globe className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 dark:text-zinc-650 pointer-events-none" />
              </div>
              <button
                onClick={handleCopy}
                disabled={isLoading || !shareUrl}
                className="h-10 px-3.5 rounded-xl border border-zinc-250 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Copy share link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Settings / Configuration */}
          <div className="pt-2 border-t border-zinc-150 dark:border-zinc-800/40 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              
              {/* Expiry selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Expires In
                </label>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(Number(e.target.value))}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 outline-none focus:border-zinc-355 transition-colors cursor-pointer"
                >
                  <option value={24}>1 Day (24h)</option>
                  <option value={168}>7 Days (1 Week)</option>
                  <option value={720}>30 Days (1 Month)</option>
                  <option value={8760}>1 Year</option>
                </select>
              </div>

              {/* Max Uses */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Max Downloads
                </label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  min="1"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 outline-none placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-zinc-355 transition-colors font-mono"
                />
              </div>

            </div>

            {/* Warning/Info note */}
            <div className="flex gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-900">
              <AlertCircle className="w-4 h-4 text-zinc-450 dark:text-zinc-500 shrink-0 mt-0.5" />
              <p className="text-[10px] leading-normal text-zinc-500 dark:text-zinc-400">
                Anyone with this link can download the file. Authentication is bypassed for public access.
              </p>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center p-4 border-t border-zinc-150 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Update Link
          </button>
          
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className={`h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              !shareUrl ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            Test Link
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}
