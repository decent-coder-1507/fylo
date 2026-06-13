"use client";

import React, { useState } from "react";
import { 
  useAuth, 
  useSendCode, 
  useSubmitCode, 
  useSubmitPassword, 
  useLogout 
} from "@/hooks/use-auth";
import { 
  Send, 
  Key, 
  Lock, 
  User, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  LogOut, 
  Phone,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

export default function TelegramConnect() {
  const { data: auth, isLoading: isAuthLoading } = useAuth();
  const sendCodeMutation = useSendCode();
  const submitCodeMutation = useSubmitCode();
  const submitPasswordMutation = useSubmitPassword();
  const logoutMutation = useLogout();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const isPending = 
    sendCodeMutation.isPending || 
    submitCodeMutation.isPending || 
    submitPasswordMutation.isPending || 
    logoutMutation.isPending;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    try {
      const result = await sendCodeMutation.mutateAsync(phoneNumber);
      if (result.status === "waiting_code") {
        toast.success("Verification code sent to your Telegram client!");
      } else if (result.authenticated) {
        toast.success("Successfully authenticated!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send verification code");
    }
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter the verification code.");
      return;
    }
    try {
      const result = await submitCodeMutation.mutateAsync(code);
      if (result.status === "waiting_password") {
        toast.info("Two-Step Verification password is required.");
      } else if (result.authenticated) {
        toast.success("Successfully authenticated!");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid verification code");
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Please enter your 2FA password.");
      return;
    }
    try {
      const result = await submitPasswordMutation.mutateAsync(password);
      if (result.authenticated) {
        toast.success("Successfully authenticated!");
      }
    } catch (err: any) {
      toast.error(err.message || "Incorrect 2FA password");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setPhoneNumber("");
      setCode("");
      setPassword("");
      toast.success("Successfully disconnected account");
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect account");
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/10 backdrop-blur-md rounded-2xl space-y-4 animate-pulse">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading connection status...</p>
      </div>
    );
  }

  const currentStatus = auth?.status || "idle";
  const errorMessage = auth?.error || sendCodeMutation.error?.message || submitCodeMutation.error?.message || submitPasswordMutation.error?.message;

  // VIEW: Authenticated State
  if (auth?.authenticated) {
    const user = auth.user;
    return (
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/10 backdrop-blur-sm space-y-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.03] rounded-full filter blur-xl pointer-events-none" />
        
        <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Account Connected
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
              Securely connected via Telegram servers
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-900/40">
            <span className="text-zinc-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Name</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {user?.firstName} {user?.lastName || ""}
            </span>
          </div>

          {user?.username && (
            <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-900/40">
              <span className="text-zinc-400 font-mono">@Username</span>
              <span className="font-semibold text-blue-500 dark:text-blue-400">@{user.username}</span>
            </div>
          )}

          {user?.phone && (
            <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-900/40">
              <span className="text-zinc-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">+{user.phone}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          disabled={isPending}
          className="w-full h-10 px-4 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/5 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          Disconnect Account
        </button>
      </div>
    );
  }

  // VIEW: Enter OTP Code
  if (currentStatus === "waiting_code") {
    return (
      <div className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/10 backdrop-blur-sm space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider font-mono">
            <Key className="w-3.5 h-3.5" />
            Verification Code
          </div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Enter Telegram OTP
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
            Telegram sent a security authentication code to your Telegram app (or SMS) on <strong className="text-zinc-800 dark:text-zinc-200">+{phoneNumber}</strong>. Please type it below.
          </p>
        </div>

        <form onSubmit={handleSubmitCode} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="otp-code" className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              OTP Code
            </label>
            <div className="relative">
              <input
                id="otp-code"
                type="text"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isPending}
                className="w-full h-10 px-3 bg-zinc-100/50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all disabled:opacity-50 text-center tracking-widest font-mono text-base"
                maxLength={10}
                required
              />
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 p-3.5 rounded-lg bg-red-500/5 border border-red-500/15 text-red-500 text-xs leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              className="flex-1 h-10 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              Restart
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-10 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify OTP"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  // VIEW: Enter 2FA Password
  if (currentStatus === "waiting_password") {
    return (
      <div className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/10 backdrop-blur-sm space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider font-mono">
            <Lock className="w-3.5 h-3.5" />
            Double Verification
          </div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
            2FA Password Required
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
            Your Telegram account is protected by Two-Step Verification. Please enter your cloud password below.
          </p>
        </div>

        <form onSubmit={handleSubmitPassword} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="twofa-password" className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              2FA Cloud Password
            </label>
            <input
              id="twofa-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              className="w-full h-10 px-3 bg-zinc-100/50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all disabled:opacity-50"
              required
            />
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 p-3.5 rounded-lg bg-red-500/5 border border-red-500/15 text-red-500 text-xs leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              className="flex-1 h-10 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              Restart
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-10 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify Password"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  // VIEW: Default / Send Code
  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/10 backdrop-blur-sm space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider font-mono">
          <Send className="w-3.5 h-3.5" />
          Setup Connection
        </div>
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Connect Telegram Account
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
          TeleStore uploads files by hosting them as message assets on your Telegram account. Enter your phone number (including country code) to connect.
        </p>
      </div>

      <form onSubmit={handleSendCode} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="phone-number" className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
            Phone Number (with Country Code)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
              <Phone className="w-3.5 h-3.5" />
            </span>
            <input
              id="phone-number"
              type="tel"
              placeholder="+12345678900"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isPending}
              className="w-full h-10 pl-9 pr-3 bg-zinc-100/50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all disabled:opacity-50"
              required
            />
          </div>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic mt-1 block">
            Note: Use international format (e.g. +14155552671)
          </span>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2 p-3.5 rounded-lg bg-red-500/5 border border-red-500/15 text-red-500 text-xs leading-normal">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-10 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send Code"}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
