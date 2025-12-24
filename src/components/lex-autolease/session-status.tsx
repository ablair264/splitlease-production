"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, RefreshCw, Copy, Check, ExternalLink, Key } from "lucide-react";
import { SESSION_CAPTURE_SCRIPT } from "@/lib/lex/constants";
import { apiFetch } from "@/lib/utils";

type SessionInfo = {
  hasValidSession: boolean;
  sessionId?: string;
  username?: string;
  role?: string;
  expiresAt?: string;
  lastUsedAt?: string;
  message?: string;
};

export function SessionStatus({ onSessionChange }: { onSessionChange?: (hasSession: boolean) => void }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCapture, setShowCapture] = useState(false);
  const [captureData, setCaptureData] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/lex-autolease/session");
      const data = await response.json();
      setSession(data);
      onSessionChange?.(data.hasValidSession);
    } catch {
      setSession({ hasValidSession: false, message: "Failed to check session" });
      onSessionChange?.(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const copyScript = async () => {
    await navigator.clipboard.writeText(SESSION_CAPTURE_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveSession = async () => {
    setError(null);
    setSaving(true);

    try {
      const sessionData = JSON.parse(captureData);
      const response = await apiFetch("/api/lex-autolease/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });

      const result = await response.json();

      if (response.ok) {
        setShowCapture(false);
        setCaptureData("");
        checkSession();
      } else {
        setError(result.error || "Failed to save session");
      }
    } catch {
      setError("Invalid JSON data. Make sure you copied the entire session output.");
    } finally {
      setSaving(false);
    }
  };

  const invalidateSession = async () => {
    await apiFetch("/api/lex-autolease/session", { method: "DELETE" });
    checkSession();
  };

  if (loading) {
    return (
      <div className="p-4 rounded-xl border animate-pulse" style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}>
        <div className="h-6 w-48 bg-white/10 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Status Card */}
      <div
        className="p-4 rounded-xl border"
        style={{
          background: session?.hasValidSession ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
          borderColor: session?.hasValidSession ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {session?.hasValidSession ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className={`font-medium ${session?.hasValidSession ? "text-green-400" : "text-red-400"}`}>
                {session?.hasValidSession ? "Session Active" : "No Active Session"}
              </p>
              {session?.hasValidSession && session.username && (
                <p className="text-xs text-white/50">
                  Logged in as {session.username} ({session.role})
                  {session.expiresAt && ` • Expires ${new Date(session.expiresAt).toLocaleTimeString()}`}
                </p>
              )}
              {!session?.hasValidSession && (
                <p className="text-xs text-white/50">Capture a session to run quotes from the server</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={checkSession}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="h-4 w-4 text-white/60" />
            </button>
            {session?.hasValidSession ? (
              <button
                onClick={invalidateSession}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => setShowCapture(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors flex items-center gap-1.5"
              >
                <Key className="h-3.5 w-3.5" />
                Capture Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Capture Modal */}
      {showCapture && (
        <div
          className="p-6 rounded-xl border space-y-4"
          style={{ background: "rgba(26, 31, 42, 0.9)", borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Key className="h-5 w-5 text-cyan-400" />
              Capture Lex Session
            </h3>
            <button onClick={() => setShowCapture(false)} className="text-white/50 hover:text-white">&times;</button>
          </div>

          <div className="space-y-3 text-sm text-white/60">
            <p>To enable server-side quotes, capture your Lex portal session:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Open{" "}
                <a
                  href="https://associate.lexautolease.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  Lex Autolease Portal <ExternalLink className="h-3 w-3" />
                </a>{" "}
                and log in
              </li>
              <li>Open Developer Tools (F12) → Console tab</li>
              <li>Paste the capture script and press Enter</li>
              <li>Paste the copied JSON below</li>
            </ol>
          </div>

          <div className="relative">
            <pre
              className="p-3 rounded-lg text-xs text-cyan-300 overflow-x-auto max-h-32"
              style={{ background: "rgba(0, 0, 0, 0.4)" }}
            >
              {SESSION_CAPTURE_SCRIPT}
            </pre>
            <button
              onClick={copyScript}
              className="absolute top-2 right-2 p-1.5 rounded bg-black/50 hover:bg-black/70 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-white/60" />}
            </button>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Paste session data here:</label>
            <textarea
              value={captureData}
              onChange={(e) => setCaptureData(e.target.value)}
              placeholder='{"csrfToken": "...", "profile": {...}, "cookies": "..."}'
              className="w-full h-24 px-3 py-2 rounded-lg text-sm bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCapture(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSession}
              disabled={!captureData.trim() || saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-500 text-white hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Session"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
