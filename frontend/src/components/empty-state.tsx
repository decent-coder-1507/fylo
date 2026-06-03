import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionButton,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-sm max-w-md mx-auto my-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 mb-4">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200 tracking-tight">{title}</h3>
      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[280px]">
        {description}
      </p>
      {actionButton && <div className="mt-5">{actionButton}</div>}
    </div>
  );
}
