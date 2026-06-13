"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check, WrapText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface CodePreviewProps {
  content: string;
  language: string;
  isTruncated: boolean;
}

export default function CodePreview({ content, language, isTruncated }: CodePreviewProps) {
  const [lineWrap, setLineWrap] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  // Simple, high-performance regex tokenizer for common language keywords and syntax
  const highlightedCode = useMemo(() => {
    const lines = content.split("\n");
    
    // JS/TS/Go/Python/Rust common keywords
    const keywords = /\b(const|let|var|function|return|import|export|from|class|extends|interface|type|default|public|private|protected|async|await|try|catch|finally|if|else|switch|case|for|while|do|break|continue|new|in|instanceof|typeof|void|yield|package|func|def|fn|struct|impl|use|pub|let|mut|match|select|go|chan|range|map|nil|null|undefined|true|false)\b/g;
    
    // Comments
    const commentRegex = /(\/\/.*|\/\*[\s\S]*?\*\/|#.*)/g;
    
    // Strings
    const stringRegex = /(["'`])(.*?)\1/g;
    
    // Numbers
    const numberRegex = /\b(\d+)\b/g;

    return lines.map((line) => {
      // Escape HTML special characters first
      let escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Apply highlighting tokens using span wrappers
      escaped = escaped
        // Highlight strings
        .replace(stringRegex, '<span class="text-emerald-600 dark:text-emerald-400">$1$2$1</span>')
        // Highlight comments (this may overlap, but works well for inline/single line)
        .replace(commentRegex, '<span class="text-zinc-400 dark:text-zinc-500">$1</span>')
        // Highlight keywords
        .replace(keywords, '<span class="text-blue-600 dark:text-blue-400 font-semibold">$1</span>')
        // Highlight numbers
        .replace(numberRegex, '<span class="text-purple-600 dark:text-purple-400">$1</span>');

      return escaped;
    });
  }, [content]);

  return (
    <div className="flex flex-col w-full h-full space-y-3">
      {/* Toolbar */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          {/* Line Wrap Toggle */}
          <button
            onClick={() => setLineWrap(!lineWrap)}
            className={`h-7 px-2.5 rounded-lg border text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              lineWrap
                ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>Wrap lines</span>
          </button>

          {/* Language badge */}
          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-[10px] font-mono text-zinc-500 border border-zinc-200 dark:border-zinc-800">
            {language}
          </span>
        </div>

        {/* Copy code button */}
        <button
          onClick={handleCopy}
          className="h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center gap-1 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500 stroke-[2.5]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Display Frame */}
      <div className="relative w-full h-[55vh] rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-950/20 overflow-hidden flex font-mono text-[11px] leading-relaxed">
        {/* Line numbers gutter */}
        <div className="select-none text-right pr-3 pl-2 py-3 bg-zinc-100/50 dark:bg-zinc-900/30 border-r border-zinc-200 dark:border-zinc-800/40 text-zinc-400 dark:text-zinc-600 min-w-8">
          {highlightedCode.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code body block */}
        <pre 
          className={`flex-1 py-3 px-4 overflow-auto text-zinc-700 dark:text-zinc-300 ${
            lineWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre overflow-x-auto"
          }`}
        >
          {highlightedCode.map((lineHTML, idx) => (
            <code 
              key={idx}
              className="block min-h-[1.5em]"
              dangerouslySetInnerHTML={{ __html: lineHTML }}
            />
          ))}
        </pre>
      </div>

      {/* Truncation warning */}
      {isTruncated && (
        <div className="flex gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-left animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-normal text-amber-600 dark:text-amber-400">
            This code preview is capped at 100KB to ensure fast load times. Download the full file to view the complete content.
          </p>
        </div>
      )}
    </div>
  );
}
