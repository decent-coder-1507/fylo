"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Cloud,
  ArrowRight,
  HardDrive,
  Layers,
  Lock,
  Zap,
  Sparkles,
  Sun,
  Moon,
  CheckCircle2,
  DollarSign,
  TrendingDown
} from "lucide-react";
import { useTheme } from "@/app/theme-provider";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  // Storage calculator states
  const [storageSize, setStorageSize] = useState(500); // in GB

  // Calculate monthly costs (standard pricing reference: $10 per 2TB)
  const traditionalCost = ((storageSize / 1000) * 5).toFixed(2);
  const teleStoreCost = "0.00";
  const yearlySavings = (parseFloat(traditionalCost) * 12).toFixed(2);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 relative overflow-hidden transition-colors duration-200">
      {/* Animated Glowing backgrounds */}
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-40 dark:opacity-20 z-0" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full filter blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-500/5 rounded-full filter blur-[120px] pointer-events-none z-0" />

      {/* Global Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 dark:border-zinc-900 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <img
              src="/fylo-complete-logo.png"
              alt="Fylo Logo"
              className="h-12 w-auto object-contain dark:invert dark:hue-rotate-180 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
            />
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/dashboard"
              className="h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              Go to Console
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-sm shadow-sm">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-[10px] font-semibold text-zinc-650 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Self-Sovereign Storage Architecture
          </span>
        </div>

        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] bg-gradient-to-b from-zinc-900 via-zinc-850 to-zinc-700 dark:from-zinc-50 dark:via-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
            Your Files. Your Servers.<br />
            No Storage Subscriptions.
          </h1>
          <p className="text-sm sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Turn decentralized communication protocols into your own infinite private drive. Fully structured virtual folders, instant access, and absolute storage sovereignty.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto h-12 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/15 hover:shadow-black/25 cursor-pointer"
          >
            Launch Free Console
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#calculator"
            className="w-full sm:w-auto h-12 px-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer text-zinc-600 dark:text-zinc-300"
          >
            Compare Savings
          </a>
        </div>

        {/* Console Preview Glass Panel */}
        <div className="pt-12 max-w-5xl mx-auto">
          <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/10 p-2.5 backdrop-blur-md shadow-2xl glass-panel animate-fade-in">
            {/* Header window control bar */}
            <div className="h-8 flex items-center justify-between px-3 border-b border-zinc-200/60 dark:border-zinc-850 bg-zinc-100/50 dark:bg-zinc-900/40 rounded-t-xl text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              </div>
              <div className="font-mono text-[10px] tracking-wider text-zinc-400">console.fylo.app</div>
              <div className="w-10" />
            </div>
            {/* Mock Screen Content */}
            <div className="p-4 sm:p-8 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-b-xl border-t border-zinc-200/20 text-left space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-250 dark:border-zinc-900">
                <div className="h-5 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-8 w-24 rounded-lg bg-zinc-900 dark:bg-zinc-50" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="h-24 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-900" />
                  <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="h-24 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-900" />
                  <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="h-24 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-900" />
                  <div className="h-4 w-12 rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/30 dark:bg-zinc-900/10 overflow-hidden">
                <div className="h-9 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 flex items-center justify-between px-4">
                  <div className="h-3.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3.5 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3.5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3.5 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-zinc-200 dark:border-zinc-900">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Engineered for Storage Sovereignty
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
            Traditional clouds lock you into high recurring fees. Fylo breaks the cycle by utilizing decentralized networks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/5 backdrop-blur-sm space-y-4 hover:border-zinc-350 dark:hover:border-zinc-700 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-blue-500 dark:text-blue-400 shadow-inner">
              <Layers className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Structured Virtual Drive</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              We translate flat messaging database logs into structured folders, files, sizes, and indexing lists, providing a standard desktop-like drive experience.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/5 backdrop-blur-sm space-y-4 hover:border-zinc-350 dark:hover:border-zinc-700 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-inner">
              <Lock className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">100% Privacy Sovereignty</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Your assets never touch third-party host databases. Files upload directly into your own private nodes and channels, secured by your custom access credentials.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/5 backdrop-blur-sm space-y-4 hover:border-zinc-350 dark:hover:border-zinc-700 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-inner">
              <Zap className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Unbounded File Size</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Bypass generic limits of traditional clouds. Upload files up to 2GB each at the full throughput speed of local internet connections with zero compression.
            </p>
          </div>
        </div>
      </section>

      {/* Savings Calculator Widget */}
      <section id="calculator" className="relative z-10 max-w-5xl mx-auto px-6 py-16 border-t border-zinc-200 dark:border-zinc-900">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white/40 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-10 backdrop-blur-md relative overflow-hidden">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              <TrendingDown className="w-3.5 h-3.5" />
              FINANCIAL FREEDOM
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Calculate Your Yearly Cloud Costs
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Why pay monthly subscription fees for cloud space? Adjust the slider to represent your virtual storage needs, and see how much you save using Fylo.
            </p>

            <div className="space-y-4">
              <div className="flex justify-between text-xs font-semibold text-zinc-550 dark:text-zinc-400 font-mono">
                <span>Storage Footprint Needs:</span>
                <span className="text-zinc-900 dark:text-zinc-200">{storageSize >= 1000 ? `${(storageSize / 1000).toFixed(1)} TB` : `${storageSize} GB`}</span>
              </div>
              <input
                type="range"
                min="50"
                max="5000"
                step="50"
                value={storageSize}
                onChange={(e) => setStorageSize(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>50 GB</span>
                <span>5.0 TB</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-950/40 text-center">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase font-mono tracking-wider">Traditional Cloud</div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-red-500 dark:text-red-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5 shrink-0" />
                {traditionalCost}
              </div>
              <div className="text-[9px] text-zinc-400 mt-1 font-mono">per month</div>
            </div>

            <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/10 rounded-bl-xl flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-[10px] font-semibold text-blue-500 uppercase font-mono tracking-wider">Fylo Space</div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5 shrink-0" />
                {teleStoreCost}
              </div>
              <div className="text-[9px] text-zinc-400 mt-1 font-mono">forever</div>
            </div>

            <div className="col-span-2 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-950/40 flex items-center justify-between gap-4">
              <div className="text-left">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase font-mono tracking-wider">Yearly Net Savings</div>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">Retained in your pocket</p>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-500 dark:text-emerald-400 flex items-center">
                + ${yearlySavings}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Specs */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-zinc-200 dark:border-zinc-900">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              Bridges Decoupled Protocols into Structured Storage
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Every major chat protocol contains an underutilized asset: unlimited storage pipelines for transmitting messages, video logs, and archives.
            </p>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Fylo provides the indexing compiler layer. We translate disorganized packet transfers into interactive directories, with folder trees, filters, search utilities, and instant download tools.
            </p>

            <ul className="space-y-3 pt-2 text-xs sm:text-sm text-zinc-700 dark:text-zinc-350">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                No credentials shared with third-party storage databases
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Built-in chunking logic for huge datasets
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Persistent search indexes for folders and uploaded names
              </li>
            </ul>
          </div>

          <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/10 p-5 backdrop-blur-md">
            <div className="space-y-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2 text-blue-500 font-semibold border-b border-zinc-200 dark:border-zinc-850 pb-2">
                <HardDrive className="w-4 h-4" />
                <span>INDEX_COMPILER_DAEMON.log</span>
              </div>
              <div className="space-y-1 bg-zinc-100/50 dark:bg-zinc-950/60 p-4 rounded-lg border border-zinc-200/60 dark:border-zinc-900 text-zinc-400 dark:text-zinc-500">
                <p className="text-blue-500">[SYSTEM] Initializing virtual directory socket...</p>
                <p className="text-emerald-500">[OK] Connection to storage nodes established.</p>
                <p>[INFO] Scanning indexes: 0 folders found. Synced.</p>
                <p className="text-purple-400">[DAEMON] Listening for secure file pipe streams...</p>
                <p>[OK] Thread pool allocated: 8 workers active.</p>
                <p className="text-yellow-500">[WARN] Cache empty. Ready for raw asset streaming.</p>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-1">
                <span>Memory Pool: 12MB</span>
                <span>Active Pipes: 0</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-zinc-200 dark:border-zinc-900 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Ready to Take Back Control?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-lg mx-auto">
            Experience absolute file storage freedom today. Zero subscription hooks. Unlimited storage. Fully virtual directory management.
          </p>
          <div className="pt-4 flex justify-center">
            <Link
              href="/dashboard"
              className="h-12 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-black/15 cursor-pointer"
            >
              Launch Dashboard Console
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-zinc-200 dark:border-zinc-900/60 py-12 text-center text-xs text-zinc-400 font-medium">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img
              src="/fylo-stack-design-logo-removebg-preview.png"
              alt="Fylo Logo"
              className="w-4 h-4 object-contain"
            />
            <span>© {new Date().getFullYear()} Fylo. Storage Sovereignty for all.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
              Source Code
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
