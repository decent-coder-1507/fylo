"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Download,
  Server,
  Calendar,
  HardDrive,
  AlertTriangle,
  Loader2,
  Clock,
  User,
  ShieldCheck
} from "lucide-react";
import { api } from "@/app/lib/axios";
import { toast } from "sonner";

// Helper to format bytes
const formatBytes = (bytes?: number, decimals = 2) => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return "0 Bytes";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// Helper to get file icon and styles
const getFileMeta = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "pdf":
      return {
        icon: FileText,
        color: "text-red-500 bg-red-500/10 border-red-500/20",
        label: "PDF Document",
      };
    case "doc":
    case "docx":
    case "txt":
    case "rtf":
    case "md":
      return {
        icon: FileText,
        color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        label: "Document",
      };
    case "xls":
    case "xlsx":
    case "csv":
      return {
        icon: FileText,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        label: "Spreadsheet",
      };
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return {
        icon: ImageIcon,
        color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        label: "Image File",
      };
    case "mp4":
    case "mov":
    case "avi":
    case "mkv":
    case "webm":
      return {
        icon: Video,
        color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        label: "Video File",
      };
    case "mp3":
    case "wav":
    case "ogg":
    case "m4a":
    case "flac":
      return {
        icon: Music,
        color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
        label: "Audio File",
      };
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return {
        icon: Archive,
        color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
        label: "Archive File",
      };
    default:
      return {
        icon: FileText,
        color: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
        label: "File",
      };
  }
};

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default function ShareLandingPage({ params }: SharePageProps) {
  const { token } = React.use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        const res = await api.get(`/share/${token}`);
        setFileInfo(res.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || "Link has expired, reached limit, or does not exist.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchFileInfo();
    }
  }, [token]);

  const handleDownload = () => {
    if (!fileInfo) return;
    setIsDownloading(true);
    toast.info("Downloading file from Telegram...");

    // Redirect user to backend download url
    window.location.href = fileInfo.downloadUrl;

    setTimeout(() => {
      setIsDownloading(false);
    }, 4000);
  };

  const getExpiryText = (expiresAtStr?: string) => {
    if (!expiresAtStr) return "Never";
    try {
      const expiresAt = new Date(expiresAtStr);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      if (diffMs <= 0) return "Expired";

      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs < 24) {
        return `Expires in ${diffHrs} hour${diffHrs !== 1 ? "s" : ""}`;
      }
      const diffDays = Math.ceil(diffHrs / 24);
      return `Expires in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    } catch {
      return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none z-0" />
        <div className="flex flex-col items-center gap-3 z-10">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs text-zinc-550 dark:text-zinc-400 font-medium">
            Fetching shared file details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !fileInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none z-0" />

        {/* Card */}
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-8 shadow-xl text-center space-y-5 z-10 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
            <AlertTriangle className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Link Unavailable
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
              {error || "This share link has expired, exceeded download limits, or is invalid."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fileMeta = getFileMeta(fileInfo.name);
  const FileIcon = fileMeta.icon;

  return (
    <div className="flex flex-col min-h-screen p-6 relative">
      {/* Background patterns */}
      <div className="absolute inset-0 grid-bg opacity-45 pointer-events-none z-0" />
      <div className="absolute top-0 left-0 right-0 h-[400px] radial-glow pointer-events-none z-0" />
      <div className="absolute top-0 right-0 h-[300px] w-[400px] radial-glow-purple pointer-events-none z-0" />

      {/* Header logo */}
      <header className="w-full max-w-4xl mx-auto py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200">
            <Server className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
            Fylo
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-450 dark:text-zinc-550 uppercase font-mono font-bold tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Secure Share
        </div>
      </header>

      {/* Main content body */}
      <main className="flex-1 flex items-center justify-center z-10 py-10">
        <div className="w-full max-w-md bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

          {/* Card Hero */}
          <div className="p-8 border-b border-zinc-150 dark:border-zinc-800/40 bg-zinc-50/40 dark:bg-zinc-950/20 text-center flex flex-col items-center justify-center space-y-4">
            <div className={`flex items-center justify-center w-16 h-16 rounded-2xl border shadow-md transition-all ${fileMeta.color}`}>
              <FileIcon className="w-8 h-8 stroke-[1.5]" />
            </div>

            <div className="space-y-1 w-full">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 break-all line-clamp-2 px-4" title={fileInfo.name}>
                {fileInfo.name}
              </h2>
              <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-semibold font-mono block uppercase">
                {fileMeta.label}
              </span>
            </div>
          </div>

          {/* Details & Specs */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">

              {/* File Size */}
              <div className="p-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-900 flex flex-col space-y-1">
                <span className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider flex items-center gap-1.5">
                  <HardDrive className="w-3 h-3 text-zinc-400" />
                  File Size
                </span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                  {formatBytes(fileInfo.size)}
                </span>
              </div>

              {/* Expiry status */}
              <div className="p-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-900 flex flex-col space-y-1">
                <span className="text-[9px] font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  Availability
                </span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {getExpiryText(fileInfo.expiresAt)}
                </span>
              </div>

            </div>

            {/* Additional info metadata (download usage if restricted) */}
            {fileInfo.maxUses && (
              <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/10 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Download Limit</span>
                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-350">
                  {fileInfo.useCount} / {fileInfo.maxUses} uses
                </span>
              </div>
            )}

            {/* Big Action button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-500/10 disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Requesting Download...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download File
                </>
              )}
            </button>
          </div>

          {/* Footer security badge */}
          <div className="p-4 bg-zinc-50/40 dark:bg-zinc-950/20 border-t border-zinc-150 dark:border-zinc-800/40 text-center">
            <span className="text-[9px] text-zinc-450 dark:text-zinc-550 leading-relaxed max-w-[280px] inline-block">
              Downloads are processed directly using Telegram server cloud channels. Bypassed auth, public landing page.
            </span>
          </div>

        </div>
      </main>

      {/* Page footer */}
      <footer className="w-full text-center py-6 text-[10px] text-zinc-400 dark:text-zinc-650 z-10">
        © 2026 Fylo Inc. Powered by Telegram.
      </footer>
    </div>
  );
}
