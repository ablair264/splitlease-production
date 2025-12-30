"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Match {
  id: string;
  sourceKey: string;
  sourceProvider: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  p11dGbp: number | null;
  capCode: string | null;
  matchedManufacturer: string | null;
  matchedModel: string | null;
  matchedVariant: string | null;
  matchedP11dGbp: number | null;
  confidence: number | null;
  status: string;
  method: string | null;
  createdAt: string;
}

interface Candidate {
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  p11dGbp: number | null;
  fuelType: string | null;
  transmission: string | null;
}

type ConfidenceFilter = "all" | "high" | "medium" | "low" | "unmatched";

export default function MatchingContent() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [providerFilter, setProviderFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchMatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (providerFilter) params.set("provider", providerFilter);
      if (searchFilter) params.set("search", searchFilter);
      params.set("limit", "200");

      const res = await fetch(`/api/admin/matching?${params}`);
      const data = await res.json();
      let filteredMatches = data.matches || [];

      // Apply confidence filter client-side
      if (confidenceFilter !== "all") {
        filteredMatches = filteredMatches.filter((m: Match) => {
          if (confidenceFilter === "high") return m.confidence !== null && m.confidence >= 90;
          if (confidenceFilter === "medium") return m.confidence !== null && m.confidence >= 70 && m.confidence < 90;
          if (confidenceFilter === "low") return m.confidence !== null && m.confidence > 0 && m.confidence < 70;
          if (confidenceFilter === "unmatched") return m.confidence === null || m.confidence === 0 || !m.capCode;
          return true;
        });
      }

      setMatches(filteredMatches);
      setStats(data.stats || {});

      // Auto-select first match if none selected
      if (filteredMatches.length > 0 && !selectedMatch) {
        setSelectedMatch(filteredMatches[0]);
        setSelectedIndex(0);
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, providerFilter, searchFilter, confidenceFilter]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, matches.length - 1);
          setSelectedMatch(matches[next]);
          return next;
        });
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          setSelectedMatch(matches[next]);
          return next;
        });
      } else if (e.key === "y" && selectedMatch?.status === "pending" && selectedMatch?.capCode) {
        e.preventDefault();
        handleAction("confirm", selectedMatch.id);
      } else if (e.key === "n" && selectedMatch?.status === "pending") {
        e.preventDefault();
        handleAction("reject", selectedMatch.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matches, selectedMatch, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const items = listRef.current.querySelectorAll("[data-match-item]");
      items[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  const handleSelectMatch = async (match: Match, index: number) => {
    setSelectedMatch(match);
    setSelectedIndex(index);
    setIsLoadingCandidates(true);
    try {
      const res = await fetch("/api/admin/matching", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manufacturer: match.manufacturer,
          model: match.model,
          variant: match.variant,
        }),
      });
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      console.error("Error fetching candidates:", err);
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleAction = async (action: "confirm" | "reject" | "rematch", matchId: string) => {
    try {
      const res = await fetch("/api/admin/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, matchId }),
      });
      if (res.ok) {
        // Remove from current list and auto-advance
        const currentIndex = matches.findIndex((m) => m.id === matchId);
        const newMatches = matches.filter((m) => m.id !== matchId);
        setMatches(newMatches);

        // Select next item
        if (newMatches.length > 0) {
          const nextIndex = Math.min(currentIndex, newMatches.length - 1);
          setSelectedMatch(newMatches[nextIndex]);
          setSelectedIndex(nextIndex);
        } else {
          setSelectedMatch(null);
          setSelectedIndex(0);
        }
      }
    } catch (err) {
      console.error("Error performing action:", err);
    }
  };

  const handleBatchConfirm = async () => {
    const highConfidenceMatches = matches.filter(
      (m) => m.status === "pending" && m.capCode && m.confidence !== null && m.confidence >= 90
    );

    if (highConfidenceMatches.length === 0) return;

    const confirmed = window.confirm(
      `Confirm ${highConfidenceMatches.length} matches with 90%+ confidence?`
    );
    if (!confirmed) return;

    setIsProcessingBatch(true);
    try {
      for (const match of highConfidenceMatches) {
        await fetch("/api/admin/matching", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm", matchId: match.id }),
        });
      }
      await fetchMatches();
    } catch (err) {
      console.error("Error batch confirming:", err);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleManualAssign = async (matchId: string, capCode: string) => {
    try {
      const res = await fetch("/api/admin/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "manual", matchId, capCode }),
      });
      if (res.ok) {
        fetchMatches();
        setSelectedMatch(null);
        setCandidates([]);
      }
    } catch (err) {
      console.error("Error assigning CAP code:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      pending: { bg: "rgba(234, 179, 8, 0.2)", text: "#eab308" },
      confirmed: { bg: "rgba(34, 197, 94, 0.2)", text: "#22c55e" },
      rejected: { bg: "rgba(239, 68, 68, 0.2)", text: "#ef4444" },
      manual: { bg: "rgba(59, 130, 246, 0.2)", text: "#3b82f6" },
    };
    const style = styles[status] || { bg: "rgba(255, 255, 255, 0.1)", text: "#ffffff" };
    return (
      <span
        className="px-2 py-0.5 rounded text-xs font-medium capitalize"
        style={{ background: style.bg, color: style.text }}
      >
        {status}
      </span>
    );
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (confidence === null) return null;
    const color =
      confidence >= 90
        ? "text-green-400 bg-green-400/10"
        : confidence >= 70
        ? "text-yellow-400 bg-yellow-400/10"
        : "text-red-400 bg-red-400/10";
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        {confidence.toFixed(0)}%
      </span>
    );
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
  };

  const getP11dDifference = (source: number | null, matched: number | null) => {
    if (source === null || matched === null) return null;
    const diff = matched - source;
    if (diff === 0) return { text: "exact", color: "text-green-400" };
    const prefix = diff > 0 ? "+" : "";
    const absValue = Math.abs(diff);
    const color = absValue <= 100 ? "text-green-400" : absValue <= 500 ? "text-yellow-400" : "text-red-400";
    return { text: `${prefix}£${diff.toFixed(2)}`, color };
  };

  const highConfidenceCount = matches.filter(
    (m) => m.status === "pending" && m.capCode && m.confidence !== null && m.confidence >= 90
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Vehicle Matching</h2>
          <p className="text-white/60 mt-1">
            Review and confirm CAP code matches • <span className="text-cyan-400">J/K</span> to navigate •{" "}
            <span className="text-green-400">Y</span> confirm • <span className="text-red-400">N</span> reject
          </p>
        </div>
        {highConfidenceCount > 0 && (
          <button
            onClick={handleBatchConfirm}
            disabled={isProcessingBatch}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#22c55e" }}
          >
            {isProcessingBatch ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Processing...
              </span>
            ) : (
              `Confirm All 90%+ (${highConfidenceCount})`
            )}
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats).map(([provider, statusCounts]) => (
          <div
            key={provider}
            className="rounded-xl p-4"
            style={{
              background: "rgba(26, 31, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <h3 className="text-sm font-medium text-white capitalize mb-2">{provider}</h3>
            <div className="space-y-1 text-xs">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-white/60 capitalize">{status}:</span>
                  <span className="text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap gap-4 p-4 rounded-xl"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <input
          type="text"
          placeholder="Search manufacturer/model..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-cyan-500/50 min-w-[200px]"
          style={{
            background: "rgba(26, 31, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500/50"
          style={{
            background: "rgba(26, 31, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
          <option value="manual">Manual</option>
        </select>
        <select
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value as ConfidenceFilter)}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500/50"
          style={{
            background: "rgba(26, 31, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <option value="all">All confidence</option>
          <option value="high">High (90%+)</option>
          <option value="medium">Medium (70-89%)</option>
          <option value="low">Low (&lt;70%)</option>
          <option value="unmatched">Unmatched</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-cyan-500/50"
          style={{
            background: "rgba(26, 31, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <option value="">All providers</option>
          <option value="ogilvie">Ogilvie</option>
          <option value="drivalia">Drivalia</option>
        </select>
      </div>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matches List */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Matches ({matches.length})</h2>
            <span className="text-xs text-white/40">
              {selectedIndex + 1} of {matches.length}
            </span>
          </div>
          <div ref={listRef} className="max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
              </div>
            ) : matches.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/60">No matches found</div>
            ) : (
              <div className="divide-y divide-white/5">
                {matches.map((match, index) => {
                  const p11dDiff = getP11dDifference(match.p11dGbp, match.matchedP11dGbp);
                  return (
                    <div
                      key={match.id}
                      data-match-item
                      onClick={() => handleSelectMatch(match, index)}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        selectedIndex === index ? "bg-cyan-500/10 border-l-2 border-l-cyan-500" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{match.manufacturer}</span>
                          <span className="text-white/60">{match.model}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getConfidenceBadge(match.confidence)}
                          {getStatusBadge(match.status)}
                        </div>
                      </div>

                      {/* Compact comparison */}
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div className="text-white/50">
                          <span className="text-white/30">Source: </span>
                          {formatCurrency(match.p11dGbp)}
                        </div>
                        {match.capCode && (
                          <div className="text-white/50">
                            <span className="text-white/30">Match: </span>
                            {formatCurrency(match.matchedP11dGbp)}
                            {p11dDiff && (
                              <span className={`ml-1 ${p11dDiff.color}`}>({p11dDiff.text})</span>
                            )}
                          </div>
                        )}
                      </div>

                      {match.capCode && (
                        <div className="text-xs text-cyan-400/70 mt-1 truncate">
                          → {match.matchedModel} {match.matchedVariant?.substring(0, 40)}...
                        </div>
                      )}

                      {/* Inline actions */}
                      {match.status === "pending" && (
                        <div className="flex gap-2 mt-2">
                          {match.capCode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction("confirm", match.id);
                              }}
                              className="px-3 py-1 rounded text-xs font-medium text-white hover:opacity-80 transition-opacity"
                              style={{ background: "#22c55e" }}
                            >
                              ✓ Confirm
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction("reject", match.id);
                            }}
                            className="px-3 py-1 rounded text-xs font-medium text-white hover:opacity-80 transition-opacity"
                            style={{ background: "#ef4444" }}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {selectedMatch ? (
            <>
              <div className="px-4 py-3 border-b border-white/10">
                <h2 className="text-sm font-medium text-white">Match Details</h2>
              </div>
              <div className="p-4 space-y-4">
                {/* Source Vehicle */}
                <div>
                  <h3 className="text-xs text-white/40 uppercase mb-2">
                    Source Vehicle ({selectedMatch.sourceProvider})
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-white">
                      <span className="text-white/60">Make:</span> {selectedMatch.manufacturer}
                    </p>
                    <p className="text-white">
                      <span className="text-white/60">Model:</span> {selectedMatch.model}
                    </p>
                    {selectedMatch.variant && (
                      <p className="text-white">
                        <span className="text-white/60">Variant:</span> {selectedMatch.variant}
                      </p>
                    )}
                    <p className="text-white">
                      <span className="text-white/60">P11D:</span> {formatCurrency(selectedMatch.p11dGbp)}
                    </p>
                  </div>
                </div>

                {/* Current Match */}
                {selectedMatch.capCode && (
                  <div>
                    <h3 className="text-xs text-white/40 uppercase mb-2">Current Match</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-cyan-400">CAP: {selectedMatch.capCode}</p>
                      <p className="text-white">
                        <span className="text-white/60">Make:</span> {selectedMatch.matchedManufacturer}
                      </p>
                      <p className="text-white">
                        <span className="text-white/60">Model:</span> {selectedMatch.matchedModel}
                      </p>
                      {selectedMatch.matchedVariant && (
                        <p className="text-white">
                          <span className="text-white/60">Variant:</span> {selectedMatch.matchedVariant}
                        </p>
                      )}
                      <p className="text-white">
                        <span className="text-white/60">P11D:</span>{" "}
                        {formatCurrency(selectedMatch.matchedP11dGbp)}
                        {(() => {
                          const diff = getP11dDifference(selectedMatch.p11dGbp, selectedMatch.matchedP11dGbp);
                          if (diff) {
                            return <span className={`ml-2 ${diff.color}`}>({diff.text})</span>;
                          }
                          return null;
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {selectedMatch.capCode && selectedMatch.status === "pending" && (
                    <button
                      onClick={() => handleAction("confirm", selectedMatch.id)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ background: "#22c55e" }}
                    >
                      Confirm Match (Y)
                    </button>
                  )}
                  {selectedMatch.status === "pending" && (
                    <button
                      onClick={() => handleAction("reject", selectedMatch.id)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ background: "#ef4444" }}
                    >
                      Reject (N)
                    </button>
                  )}
                  <button
                    onClick={() => handleAction("rematch", selectedMatch.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white/80"
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    Re-match
                  </button>
                </div>

                {/* Candidates */}
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-xs text-white/40 uppercase mb-2">CAP Code Candidates</h3>
                  {isLoadingCandidates ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent" />
                    </div>
                  ) : candidates.length === 0 ? (
                    <p className="text-sm text-white/40">No candidates found</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {candidates.map((c) => (
                        <div
                          key={c.capCode}
                          className="p-3 rounded-lg"
                          style={{
                            background: "rgba(0, 0, 0, 0.2)",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm text-white">
                                {c.manufacturer} {c.model}
                              </p>
                              {c.variant && <p className="text-xs text-white/50">{c.variant}</p>}
                              <p className="text-xs text-white/40 mt-1">
                                P11D: {formatCurrency(c.p11dGbp)} | {c.fuelType || "N/A"} |{" "}
                                {c.transmission || "N/A"}
                              </p>
                              <p className="text-xs text-cyan-400 mt-1">{c.capCode}</p>
                            </div>
                            <button
                              onClick={() => handleManualAssign(selectedMatch.id, c.capCode)}
                              className="px-3 py-1.5 rounded text-xs font-medium text-white"
                              style={{ background: "#1e8d8d" }}
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full py-12">
              <p className="text-white/40">Select a match to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
