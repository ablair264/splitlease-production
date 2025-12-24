"use client";

import { useState } from "react";
import { Loader2, LogIn, CheckCircle, XCircle, LogOut } from "lucide-react";
import { apiFetch } from "@/lib/utils";

type LoginFormProps = {
  onLoginSuccess?: () => void;
  sessionStatus?: { valid: boolean; message: string; expiresAt?: string } | null;
  onRefreshStatus?: () => void;
};

// Default credentials
const DEFAULT_EMAIL = "fleetprices";
const DEFAULT_PASSWORD = "Irlam2022";

export function OgilvieLoginForm({ onLoginSuccess, sessionStatus, onRefreshStatus }: LoginFormProps) {
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (useDefaults = false) => {
    const loginEmail = useDefaults ? DEFAULT_EMAIL : email;
    const loginPassword = useDefaults ? DEFAULT_PASSWORD : password;

    if (!loginEmail || !loginPassword) {
      setError("Please enter email and password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/ogilvie/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
      } else {
        onLoginSuccess?.();
        onRefreshStatus?.();
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        background: "rgba(26, 31, 42, 0.6)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/90">Ogilvie Fleet Login</h3>
        {sessionStatus && (
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs"
            style={{
              background: sessionStatus.valid
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${
                sessionStatus.valid
                  ? "rgba(34, 197, 94, 0.3)"
                  : "rgba(239, 68, 68, 0.3)"
              }`,
            }}
          >
            {sessionStatus.valid ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-400" />
                <span className="text-green-400">Session Active</span>
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 text-red-400" />
                <span className="text-red-400">Not Logged In</span>
              </>
            )}
          </div>
        )}
      </div>

      {sessionStatus?.valid ? (
        <div className="space-y-3">
          <p className="text-sm text-white/60">
            You are logged in to Ogilvie Fleet. Your session will remain active for exports.
          </p>
          {sessionStatus.expiresAt && (
            <p className="text-xs text-white/40">
              Session expires: {new Date(sessionStatus.expiresAt).toLocaleString()}
            </p>
          )}
          <button
            onClick={onRefreshStatus}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "rgba(255, 255, 255, 0.7)",
            }}
          >
            <LogOut className="h-4 w-4" />
            Refresh Status
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-white/50 mb-4">
            Enter your Ogilvie Fleet credentials to enable ratebook exports.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-white/70 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
                style={{
                  background: "rgba(15, 20, 25, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && handleLogin(false)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
                style={{
                  background: "rgba(15, 20, 25, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              />
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm mb-4"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          <button
            onClick={() => handleLogin(false)}
            disabled={isLoading || !email || !password}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #79d5e9 0%, #4daeac 100%)",
              color: "#0f1419",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Login to Ogilvie Fleet
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
