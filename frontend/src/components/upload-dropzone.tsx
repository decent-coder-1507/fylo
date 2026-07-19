"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useUploadFile } from "@/hooks/use-files";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";

const PIPELINE_STEPS = [
  { id: "upload", label: "Upload", description: "Uploading raw file stream to Telegram servers..." },
  { id: "parse", label: "Parse", description: "Running document parser and extracting text..." },
  { id: "summarize", label: "Summarize", description: "Synthesizing content and generating summary..." },
  { id: "tags", label: "Tagging", description: "Analyzing themes and generating search tags..." },
  { id: "index", label: "Index", description: "Computing embeddings and indexing to Qdrant..." }
];

interface UploadDropzoneProps {
  folderId: string;
}

export default function UploadDropzone({ folderId }: UploadDropzoneProps) {
  const { mutateAsync: uploadFile } = useUploadFile(folderId);
  const [isUploading, setIsUploading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      let successCount = 0;

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setProgressText(
          `Uploading "${file.name}" (${i + 1} of ${acceptedFiles.length})...`
        );
        setCurrentStep(0);

        let step = 0;
        const stepInterval = setInterval(() => {
          if (step < 4) {
            step++;
            setCurrentStep(step);
          }
        }, 2200);

        try {
          await uploadFile({ file, folderId });
          successCount++;
        } catch (error: any) {
          const errorMsg =
            error.response?.data?.message || `Failed to upload "${file.name}"`;
          toast.error(errorMsg);
        } finally {
          clearInterval(stepInterval);
        }
      }

      setIsUploading(false);
      setProgressText("");
      setCurrentStep(0);

      if (successCount > 0) {
        toast.success(
          `Successfully uploaded ${successCount} file${
            successCount > 1 ? "s" : ""
          } to Telegram!`
        );
      }
    },
    [folderId, uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`group relative rounded-xl border border-dashed p-8 md:p-10 text-center transition-all duration-300 cursor-pointer ${
        isDragActive
          ? "border-blue-500 bg-blue-500/[0.03] shadow-[0_0_20px_rgba(59,130,246,0.06)]"
          : "border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/10 hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/20"
      } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-xl border transition-all duration-300 mb-4 ${
            isDragActive
              ? "bg-blue-50 dark:bg-blue-950 border-blue-500/30 text-blue-500 dark:text-blue-400 scale-110"
              : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 group-hover:dark:text-zinc-300 group-hover:border-zinc-300 dark:group-hover:border-zinc-700"
          }`}
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <UploadCloud className="w-5 h-5 stroke-[1.5]" />
          )}
        </div>

        {isUploading ? (
          <div className="space-y-2 w-full">
            <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Smart Upload Workflow
            </h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
              {progressText}
            </p>
            {/* Animated infinite loading bar */}
            <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden mt-3 border border-zinc-300 dark:border-zinc-800">
              <div className="h-full bg-zinc-100 rounded-full w-1/3 animate-[shimmer_1.5s_infinite_linear]" style={{
                animationDuration: '1.2s',
                backgroundImage: 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
              }} />
            </div>
            
            {/* Pipeline Step Indicators */}
            <div className="grid grid-cols-5 gap-1 pt-3 text-[9px] font-mono tracking-tight select-none">
              {PIPELINE_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isActive = idx === currentStep;
                return (
                  <div key={step.id} className="flex flex-col items-center space-y-1">
                    <div className={`w-2 h-2 rounded-full border transition-all duration-300 ${
                      isCompleted 
                        ? "bg-emerald-500 border-emerald-500 scale-100 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                        : isActive 
                          ? "bg-blue-500 border-blue-500 scale-110 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                          : "bg-transparent border-zinc-300 dark:border-zinc-800 scale-90"
                    }`} />
                    <span className={`transition-colors duration-300 ${
                      isActive 
                        ? "text-blue-500 dark:text-blue-400 font-bold" 
                        : isCompleted 
                          ? "text-emerald-500 dark:text-emerald-400" 
                          : "text-zinc-400 dark:text-zinc-500"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono pt-2 text-center min-h-5 italic animate-pulse">
              {PIPELINE_STEPS[currentStep]?.description || ""}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {isDragActive
                ? "Drop files here to upload"
                : "Drag & drop files, or browse"}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-550 max-w-[260px] leading-normal">
              Telegram allows files up to <span className="font-mono text-zinc-700 dark:text-zinc-400">2 GB</span>. Uploaded files are securely stored in your channel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
