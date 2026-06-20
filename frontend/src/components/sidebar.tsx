"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Folder,
  Layers,
  HardDrive,
  MessageCircle,
  Menu,
  X,
  Server,
  Terminal,
  Activity,
  Cpu,
  Sun,
  Moon,
  LogOut,
  User,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/app/theme-provider";
import { useAuth, useLogout } from "@/hooks/use-auth";
import TelegramConnect from "@/components/telegram-connect";

interface SidebarProps {
  children: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const { data: auth, isLoading: isAuthLoading } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (err) {
      console.error("Failed to disconnect", err);
    }
  };

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: Layers },
    // Folders details routes can still fall under "Dashboard" or general explorer
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 relative transition-colors duration-200">
      {/* Animated radial glowing background */}
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-80 dark:opacity-40 z-0" />
      <div className="absolute top-0 left-0 right-0 h-[500px] radial-glow pointer-events-none z-0" />
      <div className="absolute top-0 right-0 h-[400px] w-[500px] radial-glow-purple pointer-events-none z-0" />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-900 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md z-10 shrink-0 transition-colors duration-200">
        {/* Branding header */}
        <div className="h-20 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-900">
          <Link href="/dashboard" className="flex items-center group">
            <img
              src="/fylo-full-logo-2.png"
              alt="Fylo Logo"
              className="h-14 w-auto object-contain dark:invert dark:hue-rotate-180 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
            />
          </Link>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 mb-2">
            Workspace
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive
                  ? "bg-zinc-200/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "border border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40"
                  }`}
              >
                <Icon className={`w-4 h-4 stroke-[1.5] ${isActive ? "text-blue-500 dark:text-blue-400" : ""}`} />
                {item.name}
              </Link>
            );
          })}

          {/* Theme Toggle Button */}
          <div className="pt-4 mt-4 border-t border-zinc-200/60 dark:border-zinc-900">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3">
                {theme === "dark" ? (
                  <>
                    <Sun className="w-4 h-4 stroke-[1.5] text-amber-500" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 stroke-[1.5] text-blue-500" />
                    <span>Dark Mode</span>
                  </>
                )}
              </span>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-mono">
                {theme}
              </span>
            </button>
          </div>
        </nav>

        {/* Storage status & System status indicators */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-900 space-y-4">
          {auth?.authenticated && (
            <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/20 backdrop-blur-sm flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Connected Account
                </div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                  {auth.user?.firstName}
                </div>
                {auth.user?.username && (
                  <div className="text-[10px] text-blue-500 dark:text-blue-400 font-mono truncate">
                    @{auth.user.username}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                title="Disconnect Account"
                className="p-1.5 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/5 text-red-500 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/20 backdrop-blur-sm space-y-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                Storage Efficiency
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono">
                Unlimited
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-normal">
              Powered by Telegram channels. Upload sizes up to 2GB per file.
            </p>
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 px-1 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              System Online
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">v1.2.0</span>
          </div>
        </div>
      </aside>

      {/* Mobile Hamburger & Header */}
      <div className="flex flex-col flex-1 min-w-0 z-10">
        <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-900 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md md:hidden shrink-0 transition-colors duration-200">
          <Link href="/" className="flex items-center group">
            <img
              src="/fylo-complete-logo.png"
              alt="Fylo Logo"
              className="h-11 w-auto object-contain dark:invert dark:hue-rotate-180 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
            />
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-blue-500" />
              )}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Mobile Nav Menu Drawer */}
        {mobileOpen && (
          <div className="fixed inset-x-0 top-16 bottom-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md z-40 p-6 flex flex-col space-y-6 md:hidden border-t border-zinc-200 dark:border-zinc-900">
            <nav className="space-y-1">
              <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 mb-2">
                Workspace
              </div>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                      ? "bg-zinc-200/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "border border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/40 dark:hover:bg-zinc-900/40"
                      }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {auth?.authenticated && (
              <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/20 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Connected Account
                  </div>
                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                    {auth.user?.firstName}
                  </div>
                  {auth.user?.username && (
                    <div className="text-xs text-blue-500 dark:text-blue-400 font-mono truncate">
                      @{auth.user.username}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  title="Disconnect Account"
                  className="p-2 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/5 text-red-500 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/20 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  Storage Efficiency
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono">
                  Unlimited
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-normal">
                Powered by Telegram channels. Upload sizes up to 2GB per file.
              </p>
            </div>
          </div>
        )}

        {/* Main Content wrapper */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <div className="max-w-5xl mx-auto">
            {isAuthLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-pulse">
                <Loader2 className="w-8 h-8 text-blue-500 dark:text-blue-500 animate-spin" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Verifying session status...</p>
              </div>
            ) : logoutMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Disconnecting account...</p>
              </div>
            ) : !auth?.authenticated ? (
              <div className="max-w-md mx-auto py-12 space-y-6">
                <div className="text-center space-y-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-50 dark:to-zinc-400 bg-clip-text text-transparent">
                    Access Restricted
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Please connect your Telegram account to unlock your storage console.
                  </p>
                </div>
                <TelegramConnect />
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
