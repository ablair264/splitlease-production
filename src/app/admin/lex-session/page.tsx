"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Copy, ExternalLink } from "lucide-react";

export default function LexSessionPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [cookies, setCookies] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [currentSession, setCurrentSession] = useState<{
    hasValidSession: boolean;
    username?: string;
    expiresAt?: string;
  } | null>(null);

  // Check current session
  useEffect(() => {
    fetch("/api/lex-autolease/session")
      .then((r) => r.json())
      .then(setCurrentSession)
      .catch(() => setCurrentSession({ hasValidSession: false }));
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/lex-autolease/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csrfToken: csrfToken.trim(),
          cookies: cookies.trim(),
          profile: {}, // Profile is optional
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus("success");
        setMessage(`Session saved! Expires: ${new Date(result.expiresAt).toLocaleString()}`);
        setCsrfToken("");
        setCookies("");
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to save session");
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Invalid data");
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(`console.log("CSRF Token:", window.csrf_token);`);
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Lex Session Capture</h1>
        <p className="text-white/50 mb-6">
          Capture your Lex session to enable server-side quote fetching
        </p>

        {/* Current Session Status */}
        {currentSession && (
          <div
            className={`p-4 rounded-xl border mb-6 ${
              currentSession.hasValidSession
                ? "bg-green-500/10 border-green-500/30"
                : "bg-yellow-500/10 border-yellow-500/30"
            }`}
          >
            {currentSession.hasValidSession ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <span className="text-green-400 font-medium">Session Active</span>
                  <span className="text-white/50 ml-2">
                    Expires: {new Date(currentSession.expiresAt!).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-400">No valid session - capture one below</span>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-black/30 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4 text-lg">How to Capture Your Session</h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#79d5e9]/20 flex items-center justify-center text-[#79d5e9] font-bold">
                1
              </div>
              <div>
                <p className="font-medium mb-1">Login to the Lex Portal</p>
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

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#79d5e9]/20 flex items-center justify-center text-[#79d5e9] font-bold">
                2
              </div>
              <div>
                <p className="font-medium mb-1">Get the CSRF Token</p>
                <p className="text-sm text-white/60 mb-2">
                  Open DevTools (F12) → Console → paste this:
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-black/50 px-3 py-1.5 rounded text-green-400 text-sm">
                    console.log(window.csrf_token)
                  </code>
                  <button
                    onClick={copyScript}
                    className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white"
                    title="Copy"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">
                  Copy the output (looks like: abc123-def456-...)
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#79d5e9]/20 flex items-center justify-center text-[#79d5e9] font-bold">
                3
              </div>
              <div>
                <p className="font-medium mb-1">Get the Full Cookies (including HttpOnly)</p>
                <p className="text-sm text-white/60 mb-2">
                  This is the important part - we need cookies that JavaScript can&apos;t access:
                </p>
                <ol className="text-sm text-white/60 space-y-1 list-disc list-inside ml-2">
                  <li>Open DevTools → <strong>Network</strong> tab</li>
                  <li>Navigate to <strong>Quote</strong> in the Lex portal (any quote page)</li>
                  <li>Find any request to <code className="text-[#79d5e9]">/services/Quote.svc/</code></li>
                  <li>Click it → <strong>Headers</strong> → scroll to <strong>Request Headers</strong></li>
                  <li>Find <strong>Cookie:</strong> and copy the <em>entire</em> value</li>
                </ol>
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-300">
                  The cookie string is very long - make sure you copy ALL of it
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#79d5e9]/20 flex items-center justify-center text-[#79d5e9] font-bold">
                4
              </div>
              <div>
                <p className="font-medium">Paste below and save</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">CSRF Token</label>
            <input
              type="text"
              value={csrfToken}
              onChange={(e) => setCsrfToken(e.target.value)}
              placeholder="e.g., 25fdf6b9-8864-4342-aaab-a92124454c44"
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#79d5e9]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Full Cookie String (from Network tab)
            </label>
            <textarea
              value={cookies}
              onChange={(e) => setCookies(e.target.value)}
              placeholder="Paste the entire Cookie header value here..."
              rows={6}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#79d5e9]"
            />
            <p className="text-xs text-white/40 mt-1">
              Should include .ASPXAUTH or similar session cookie
            </p>
          </div>

          <button
            type="submit"
            disabled={!csrfToken.trim() || !cookies.trim() || status === "loading"}
            className="w-full py-3 rounded-lg font-medium bg-[#79d5e9] text-[#0f1419] hover:bg-[#5bc4dc] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "Saving..." : "Save Session"}
          </button>
        </form>

        {status === "success" && (
          <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            {message}
          </div>
        )}

        {status === "error" && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/admin/lex-autolease" className="text-[#79d5e9] hover:underline text-sm">
            ← Back to Lex Autolease
          </a>
        </div>
      </div>
    </div>
  );
}
