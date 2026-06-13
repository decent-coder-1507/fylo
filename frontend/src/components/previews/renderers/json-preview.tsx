"use client";

import React, { useState } from "react";
import { Copy, Check, Eye, Code, ChevronRight, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";

interface JsonPreviewProps {
  content: string;
}

// Collapsible tree leaf node element
interface JsonNodeProps {
  name: string | number;
  value: any;
  depth: number;
}

function JsonNode({ name, value, depth }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(depth > 1); // Auto-collapse deeper layers

  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);
  const type = typeof value;

  const renderValueText = () => {
    if (value === null) return <span className="text-zinc-400">null</span>;
    if (type === "string") return <span className="text-emerald-600 dark:text-emerald-400">"{value}"</span>;
    if (type === "number") return <span className="text-purple-600 dark:text-purple-400">{value}</span>;
    if (type === "boolean") return <span className="text-amber-600 dark:text-amber-500">{value.toString()}</span>;
    return <span className="text-zinc-500">{String(value)}</span>;
  };

  const getBracketText = () => {
    if (isArray) return `Array [${value.length}]`;
    return "Object {…}";
  };

  if (!isObject) {
    return (
      <div 
        className="flex py-0.5 items-baseline hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 px-1 rounded transition-colors"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <span className="text-blue-600 dark:text-blue-400 font-medium mr-1.5">{name}:</span>
        <span className="font-mono">{renderValueText()}</span>
      </div>
    );
  }

  const keys = Object.keys(value);

  return (
    <div className="flex flex-col">
      {/* Header node with toggle expand */}
      <div 
        onClick={() => setCollapsed(!collapsed)}
        className="flex py-0.5 items-center hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 px-1 rounded transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <button className="p-0.5 text-zinc-400 dark:text-zinc-500 mr-0.5">
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
        <span className="text-blue-600 dark:text-blue-400 font-medium mr-1.5">{name}:</span>
        <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10.5px]">
          {getBracketText()}
        </span>
      </div>

      {/* Children list */}
      {!collapsed && (
        <div className="flex flex-col border-l border-zinc-200/60 dark:border-zinc-800/40 ml-2.5 my-0.5">
          {keys.map((key) => (
            <JsonNode
              key={key}
              name={key}
              value={value[key]}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function JsonPreview({ content }: JsonPreviewProps) {
  const [activeTab, setActiveTab] = useState<"tree" | "raw">("tree");
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  let parsedJson: any = null;
  let parseError: string | null = null;
  let prettyRaw = "";

  try {
    parsedJson = JSON.parse(content);
    prettyRaw = JSON.stringify(parsedJson, null, 2);
  } catch (err: any) {
    parseError = err.message || "Failed to parse JSON content";
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prettyRaw || content);
      setCopied(true);
      toast.success("JSON copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  // Minimal matching filter
  const filterJson = (obj: any, query: string): any => {
    if (!query) return obj;
    if (typeof obj !== "object" || obj === null) return obj;
    const lowerQuery = query.toLowerCase();

    if (Array.isArray(obj)) {
      return obj
        .map((item) => filterJson(item, query))
        .filter((item) => {
          if (typeof item === "object" && item !== null) {
            return Object.keys(item).length > 0;
          }
          return String(item).toLowerCase().includes(lowerQuery);
        });
    }

    const filtered: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const keyMatches = key.toLowerCase().includes(lowerQuery);
      
      if (typeof value === "object" && value !== null) {
        const childFiltered = filterJson(value, query);
        if (Object.keys(childFiltered).length > 0 || keyMatches) {
          filtered[key] = childFiltered;
        }
      } else if (keyMatches || String(value).toLowerCase().includes(lowerQuery)) {
        filtered[key] = value;
      }
    }
    return filtered;
  };

  const displayJson = parsedJson ? filterJson(parsedJson, searchQuery) : null;

  return (
    <div className="flex flex-col w-full h-full space-y-3">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between px-1">
        {/* Toggle tabs */}
        <div className="flex items-center gap-1.5 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 self-start">
          <button
            onClick={() => setActiveTab("tree")}
            className={`h-7 px-3 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "tree"
                ? "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 font-semibold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Interactive Tree</span>
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
            <span>Raw Indented</span>
          </button>
        </div>

        {/* Search & Copy */}
        <div className="flex items-center gap-2">
          {activeTab === "tree" && !parseError && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search keys/values..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-8 pr-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 text-[10px] text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none w-44 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all"
              />
            </div>
          )}

          <button
            onClick={handleCopy}
            className="h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center gap-1 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 text-emerald-500 stroke-[2.5]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main View Container */}
      <div className="w-full h-[55vh] rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-950/20 overflow-auto p-4 text-left font-mono text-[11px] leading-relaxed">
        {parseError ? (
          <div className="space-y-2 text-zinc-700 text-red-500">
            <p className="font-semibold text-xs">Error parsing JSON payload:</p>
            <pre className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-[10.5px] whitespace-pre-wrap break-all leading-normal">
              {parseError}
            </pre>
            <p className="text-[10px] text-zinc-500">Showing unparsed raw string:</p>
            <pre className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-all">
              {content}
            </pre>
          </div>
        ) : activeTab === "raw" ? (
          <pre className="text-zinc-700 dark:text-zinc-300 whitespace-pre overflow-x-auto">
            {prettyRaw}
          </pre>
        ) : (
          <div className="flex flex-col space-y-0.5">
            {displayJson && typeof displayJson === "object" ? (
              Object.keys(displayJson).map((key) => (
                <JsonNode
                  key={key}
                  name={key}
                  value={displayJson[key]}
                  depth={0}
                />
              ))
            ) : (
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {String(displayJson)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
