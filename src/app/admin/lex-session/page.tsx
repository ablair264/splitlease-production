"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Bookmark, ExternalLink, RefreshCw } from "lucide-react";
import { generateBookmarklet } from "@/lib/lex/constants";

export default function LexSessionPage() {
  const [status, setStatus] = useState<"loading" | "valid" | "expired" | "none">("loading");
  const [sessionInfo, setSessionInfo] = useState<{
    expiresAt?: string;
    username?: string;
  } | null>(null);
  const [bookmarkletUrl, setBookmarkletUrl] = useState("");

  // Generate bookmarklet URL on client side
  useEffect(() => {
    const apiUrl = window.location.origin;
    setBookmarkletUrl(generateBookmarklet(apiUrl));
  }, []);

  // Check current session status
  const checkSession = async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/lex-autolease/session");
      const data = await response.json();

      if (data.hasValidSession) {
        setStatus("valid");
        setSessionInfo({
          expiresAt: data.expiresAt,
          username: data.username,
        });
      } else {
        setStatus("none");
        setSessionInfo(null);
      }
    } catch {
      setStatus("none");
      setSessionInfo(null);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="p-2 rounded-lg"
            style={{ background: "rgba(121, 213, 233, 0.15)" }}
          >
            <Bookmark className="h-5 w-5 text-[#79d5e9]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Lex Session</h1>
        </div>
        <p className="text-white/50">
          One-click session capture for Lex Autolease quotes
        </p>
      </div>

      {/* Session Status */}
      <div
        className={`p-4 rounded-xl border mb-6 ${
          status === "valid"
            ? "bg-green-500/10 border-green-500/30"
            : status === "loading"
            ? "bg-white/5 border-white/10"
            : "bg-yellow-500/10 border-yellow-500/30"
        }`}
      >
        {status === "loading" ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-white/50 animate-spin" />
            <span className="text-white/50">Checking session...</span>
          </div>
        ) : status === "valid" ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <span className="text-green-400 font-medium">Session Active</span>
                {sessionInfo?.expiresAt && (
                  <span className="text-white/50 ml-2 text-sm">
                    Expires: {new Date(sessionInfo.expiresAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={checkSession}
              className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <span className="text-yellow-400">No valid session - capture one below</span>
            </div>
            <button
              onClick={checkSession}
              className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* One-Click Bookmarklet */}
      <div className="bg-black/30 border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="font-semibold mb-4 text-lg text-white">📌 One-Click Setup</h2>

        <div className="space-y-4">
          {/* Step 1: Drag bookmarklet */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#79d5e9]/20 flex items-center justify-center text-[#79d5e9] font-bold text-sm">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium mb-2 text-white">Drag this button to your bookmarks bar:</p>
              {bookmarkletUrl && (
                <a
                  href={bookmarkletUrl}
                  onClick={(e) => e.preventDefault()}
                  draggable="true"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all"
                  style={{
                    background: "linear-gradient(135deg, #79d5e9 0%, #5bc0d8 100%)",
                    color: "#0f1419",
                    cursor: "grab",
                  }}
                >
                  <Bookmark className="h-4 w-4" />
                  Capture Lex Session
                </a>
              )}
              <p className="text-xs text-white/40 mt-2">
                Drag the button above to your browser's bookmarks bar
              </p>
            </div>
          </div>

          {/* Step 2: Login to Lex */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#79d5e9]/20 flex items-center justify-center text-[#79d5e9] font-bold text-sm">
              2
            </div>
            <div>
              <p className="font-medium mb-1 text-white">Login to Lex Autolease</p>
              <a
                href="https://associate.lexautolease.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#79d5e9] hover:underline text-sm"
              >
                associate.lexautolease.co.uk
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Step 3: Click bookmarklet */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#79d5e9]/20 flex items-center justify-center text-[#79d5e9] font-bold text-sm">
              3
            </div>
            <div>
              <p className="font-medium mb-1 text-white">Click the bookmarklet</p>
              <p className="text-sm text-white/60">
                Once logged in, click "Capture Lex Session" in your bookmarks.
                <br />
                You'll see a ✅ confirmation when it's captured.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative: Direct Link (for testing) */}
      <details className="bg-black/20 border border-white/10 rounded-xl">
        <summary className="p-4 cursor-pointer text-white/60 hover:text-white text-sm">
          Alternative: Manual capture (for advanced users)
        </summary>
        <div className="p-4 pt-0 text-sm">
          <p className="text-white/50 mb-3">
            If the bookmarklet doesn't work, you can manually capture your session:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-white/60">
            <li>Login to the Lex portal</li>
            <li>Open DevTools (F12) → Console</li>
            <li>Type: <code className="bg-black/50 px-2 py-0.5 rounded text-green-400">copy(window.csrf_token)</code></li>
            <li>Paste the CSRF token below</li>
            <li>Go to Application → Cookies and copy all cookie values</li>
          </ol>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">CSRF Token</label>
              <input
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Cookies</label>
              <textarea
                placeholder=".ASPXAUTH=xxx; ASP.NET_SessionId=xxx; ..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm resize-none"
              />
            </div>
            <button
              className="px-4 py-2 rounded-lg bg-[#79d5e9]/20 text-[#79d5e9] text-sm hover:bg-[#79d5e9]/30"
            >
              Save Session
            </button>
          </div>
        </div>
      </details>

      {/* Help text */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-sm text-blue-300">
          <strong>Why is this needed?</strong> Lex blocks automated access from servers,
          but allows API calls using your browser session. This captures your login session
          so our server can fetch quotes on your behalf.
        </p>
      </div>
    </div>
  );
}
