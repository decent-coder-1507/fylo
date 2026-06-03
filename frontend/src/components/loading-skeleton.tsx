import React from "react";

export function CardSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-sm space-y-4">
      <div className="flex justify-between items-start">
        <div className="w-10 h-10 rounded-lg shimmer-bg" />
        <div className="w-4 h-4 rounded shimmer-bg" />
      </div>
      <div className="space-y-2 pt-1">
        <div className="w-2/3 h-5 rounded shimmer-bg" />
        <div className="w-1/2 h-3.5 rounded shimmer-bg" />
      </div>
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/50 flex justify-between items-center">
        <div className="w-16 h-3 rounded shimmer-bg" />
        <div className="w-12 h-3 rounded shimmer-bg" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FileRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 border-b border-zinc-200 dark:border-zinc-800/60">
      <div className="flex items-center gap-3 w-1/2">
        <div className="w-8 h-8 rounded-lg shimmer-bg shrink-0" />
        <div className="w-2/3 h-4 rounded shimmer-bg" />
      </div>
      <div className="w-24 h-4 rounded shimmer-bg hidden md:block" />
      <div className="w-32 h-4 rounded shimmer-bg hidden sm:block" />
      <div className="w-8 h-8 rounded shimmer-bg shrink-0" />
    </div>
  );
}

export function FileListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/30 dark:bg-zinc-900/10 overflow-hidden">
      <div className="flex items-center justify-between py-3 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955/40">
        <div className="w-24 h-4 rounded shimmer-bg" />
        <div className="w-16 h-4 rounded shimmer-bg hidden md:block" />
        <div className="w-20 h-4 rounded shimmer-bg hidden sm:block" />
        <div className="w-8 h-4 rounded shimmer-bg" />
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
        {Array.from({ length: count }).map((_, i) => (
          <FileRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function DashboardHeaderSkeleton() {
  return (
    <div className="space-y-4 mb-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="w-48 h-8 rounded shimmer-bg" />
          <div className="w-72 h-4 rounded shimmer-bg" />
        </div>
        <div className="w-32 h-10 rounded-lg shimmer-bg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-900/20 space-y-3">
            <div className="w-24 h-4 rounded shimmer-bg" />
            <div className="w-16 h-7 rounded shimmer-bg" />
            <div className="w-36 h-3 rounded shimmer-bg" />
          </div>
        ))}
      </div>
    </div>
  );
}
