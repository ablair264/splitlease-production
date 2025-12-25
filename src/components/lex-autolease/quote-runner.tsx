"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertCircle, Chrome, ExternalLink } from "lucide-react";

type SessionInfo = {
  hasValidSession: boolean;
  username?: string;
  expiresAt?: string;
};

export function QuoteRunner({ onQuotesComplete }: { onQuotesComplete?: () => void }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Check session status
  const checkSession = async () => {
    try {
      const response = await fetch("/api/lex-autolease/session");
      const data = await response.json();
      console.log("Session check response:", data);
      setSession(data);
    } catch (error) {
      console.error("Session check failed:", error);
      setSession({ hasValidSession: false });
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (sessionLoading) {
    return (
      <div className="p-8 text-center text-white/50">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        Checking session...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Session Status */}
      <div
        className={`p-4 rounded-xl border ${
          session?.hasValidSession
            ? "bg-green-500/10 border-green-500/30"
            : "bg-yellow-500/10 border-yellow-500/30"
        }`}
      >
        <div className="flex items-center gap-3">
          {session?.hasValidSession ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <span className="text-green-400 font-medium">Session Active</span>
                {session.expiresAt && (
                  <span className="text-white/50 ml-2 text-sm">
                    Expires: {new Date(session.expiresAt).toLocaleString()}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <span className="text-yellow-400">No valid session</span>
            </>
          )}
        </div>
      </div>

      {/* Browser Extension Required Notice */}
      <div
        className="p-6 rounded-xl border"
        style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg" style={{ background: "rgba(121, 213, 233, 0.15)" }}>
            <Chrome className="h-6 w-6 text-[#79d5e9]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Browser Extension Required
            </h3>
            <p className="text-sm text-white/60 mb-4">
              Due to Lex&apos;s security restrictions, quotes must be run from your browser
              using our Chrome extension. The extension captures your session and runs
              quotes directly from your IP.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#79d5e9]/20 flex items-center justify-center text-[#79d5e9] font-bold text-xs">
                  1
                </div>
                <div>
                  <p className="text-sm text-white">Install the extension</p>
                  <p className="text-xs text-white/40">
                    Load unpacked from: <code className="bg-black/30 px-1 rounded">extensions/lex-session-capture</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#79d5e9]/20 flex items-center justify-center text-[#79d5e9] font-bold text-xs">
                  2
                </div>
                <div>
                  <p className="text-sm text-white">Login to Lex portal &amp; capture session</p>
                  <a
                    href="https://associate.lexautolease.co.uk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#79d5e9] hover:underline"
                  >
                    associate.lexautolease.co.uk
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#79d5e9]/20 flex items-center justify-center text-[#79d5e9] font-bold text-xs">
                  3
                </div>
                <div>
                  <p className="text-sm text-white">Run quotes from the extension</p>
                  <p className="text-xs text-white/40">
                    Click the extension icon → Test Quote
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why this is needed */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-sm text-blue-300">
          <strong>Why?</strong> Lex blocks API requests from server IPs (Netlify, Railway, etc).
          The browser extension runs quotes from your residential IP, which Lex allows.
        </p>
      </div>

      {/* Link to session page */}
      <div className="text-center">
        <a
          href="/admin/lex-session"
          className="text-sm text-[#79d5e9] hover:underline"
        >
          Or capture session manually →
        </a>
      </div>
    </div>
  );
}
