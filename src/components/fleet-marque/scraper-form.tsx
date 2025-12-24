"use client";

import { useState } from "react";
import { FLEET_MARQUE_MAKES } from "@/lib/scraper/fleet-marque-constants";
import { Loader2, Play, CheckCircle, XCircle, Key, User } from "lucide-react";
import { apiFetch } from "@/lib/utils";

type ScraperFormProps = {
  onComplete?: () => void;
};

type AuthMethod = "credentials" | "session";

export function ScraperForm({ onComplete }: ScraperFormProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>("credentials");

  // Email/password auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Session auth
  const [sid, setSid] = useState("");
  const [phpsessid, setPhpsessid] = useState("");

  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    vehiclesScraped?: number;
    vehiclesLinked?: number;
    vehiclesCreated?: number;
    error?: string;
  } | null>(null);

  const toggleMake = (slug: string) => {
    setSelectedMakes(prev =>
      prev.includes(slug)
        ? prev.filter(m => m !== slug)
        : [...prev, slug]
    );
  };

  const selectAll = () => {
    setSelectedMakes(FLEET_MARQUE_MAKES.map(m => m.slug));
  };

  const selectNone = () => {
    setSelectedMakes([]);
  };

  const canRun = authMethod === "credentials"
    ? (email && password)
    : (sid && phpsessid);

  const runScraper = async () => {
    if (!canRun) {
      setResult({
        success: false,
        error: authMethod === "credentials"
          ? "Please enter email and password"
          : "Please enter both SID and PHPSESSID"
      });
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const body = authMethod === "credentials"
        ? { email, password, selectedMakes: selectedMakes.length > 0 ? selectedMakes : undefined }
        : { sid, phpsessid, selectedMakes: selectedMakes.length > 0 ? selectedMakes : undefined };

      const response = await apiFetch("/api/fleet-marque/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ success: false, error: data.error || "Scraper failed" });
      } else {
        setResult({
          success: true,
          vehiclesScraped: data.vehiclesScraped,
          vehiclesLinked: data.vehiclesLinked,
          vehiclesCreated: data.vehiclesCreated
        });
        onComplete?.();
      }
    } catch (err) {
      setResult({ success: false, error: "Network error" });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Authentication Method Toggle */}
      <div
        className="rounded-xl p-5 border"
        style={{
          background: 'rgba(26, 31, 42, 0.6)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}
      >
        <h3 className="text-sm font-semibold text-white/90 mb-4">Authentication</h3>

        {/* Method Tabs */}
        <div
          className="flex gap-1 p-1 rounded-lg mb-4 w-fit"
          style={{
            background: 'rgba(15, 20, 25, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <button
            onClick={() => setAuthMethod("credentials")}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
            style={{
              background: authMethod === "credentials" ? 'rgba(121, 213, 233, 0.15)' : 'transparent',
              color: authMethod === "credentials" ? '#79d5e9' : 'rgba(255, 255, 255, 0.5)'
            }}
          >
            <User className="h-4 w-4" />
            Email & Password
          </button>
          <button
            onClick={() => setAuthMethod("session")}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
            style={{
              background: authMethod === "session" ? 'rgba(121, 213, 233, 0.15)' : 'transparent',
              color: authMethod === "session" ? '#79d5e9' : 'rgba(255, 255, 255, 0.5)'
            }}
          >
            <Key className="h-4 w-4" />
            Session Tokens
          </button>
        </div>

        {/* Credentials Form */}
        {authMethod === "credentials" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/70 mb-1.5">
                Fleet Marque Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
                style={{
                  background: 'rgba(15, 20, 25, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
                style={{
                  background: 'rgba(15, 20, 25, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              />
            </div>
          </div>
        )}

        {/* Session Form */}
        {authMethod === "session" && (
          <>
            <p className="text-xs text-white/50 mb-4">
              Log into Fleet Marque in your browser and copy the session details from the URL and cookies.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/70 mb-1.5">
                  Session ID (sid from URL)
                </label>
                <input
                  type="text"
                  value={sid}
                  onChange={(e) => setSid(e.target.value)}
                  placeholder="e.g., sbqlpqkannugi8beudm8hq66ho"
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
                  style={{
                    background: 'rgba(15, 20, 25, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1.5">
                  PHPSESSID (from cookies)
                </label>
                <input
                  type="text"
                  value={phpsessid}
                  onChange={(e) => setPhpsessid(e.target.value)}
                  placeholder="e.g., abc123def456..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
                  style={{
                    background: 'rgba(15, 20, 25, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Make Selection */}
      <div
        className="rounded-xl p-5 border"
        style={{
          background: 'rgba(26, 31, 42, 0.6)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white/90">Select Makes</h3>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-[#79d5e9] hover:underline"
            >
              Select All
            </button>
            <span className="text-white/30">|</span>
            <button
              onClick={selectNone}
              className="text-xs text-white/50 hover:text-white/70"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FLEET_MARQUE_MAKES.map((make) => (
            <button
              key={make.slug}
              onClick={() => toggleMake(make.slug)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                background: selectedMakes.includes(make.slug)
                  ? 'rgba(121, 213, 233, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${selectedMakes.includes(make.slug) ? 'rgba(121, 213, 233, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                color: selectedMakes.includes(make.slug) ? '#79d5e9' : 'rgba(255, 255, 255, 0.6)'
              }}
            >
              {make.name}
            </button>
          ))}
        </div>

        <p className="text-xs text-white/40 mt-3">
          {selectedMakes.length === 0 ? "All makes will be scraped" : `${selectedMakes.length} make(s) selected`}
        </p>
      </div>

      {/* Run Button & Result */}
      <div className="flex items-center gap-4">
        <button
          onClick={runScraper}
          disabled={isRunning || !canRun}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #79d5e9 0%, #4daeac 100%)',
            color: '#0f1419'
          }}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Scraper...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Scraper
            </>
          )}
        </button>

        {result && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{
              background: result.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${result.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
          >
            {result.success ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-400">
                  Scraped {result.vehiclesScraped} vehicles ({result.vehiclesLinked} linked, {result.vehiclesCreated} created)
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-400">{result.error}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
