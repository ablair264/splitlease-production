"use client";

import { useState } from "react";
import { cn, formatDate, getScoreColor } from "@/lib/utils";
import type { leads } from "@/lib/db/schema";
import {
  Mail,
  Phone,
  Send,
  Sparkles,
  Car,
  Wallet,
  Calendar,
  User,
  Building2,
  RefreshCw,
} from "lucide-react";

type Lead = typeof leads.$inferSelect;

type LeadDetailProps = {
  lead: Lead;
};

export function LeadDetail({ lead }: LeadDetailProps) {
  const [draftText, setDraftText] = useState(lead.draftResponse || "");
  const [isSending, setIsSending] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleSend = async () => {
    if (!lead.email || !draftText) return;
    setIsSending(true);
    
    try {
      await fetch(`/api/leads/${lead.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draftText }),
      });
      // TODO: Show success toast, update status
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/regenerate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.draftResponse) {
        setDraftText(data.draftResponse);
      }
    } catch (error) {
      console.error("Failed to regenerate:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const vehiclePrefs = lead.vehiclePreferences as {
    makes?: string[];
    models?: string[];
    bodyTypes?: string[];
    fuelTypes?: string[];
  } | null;

  const budget = lead.budget as {
    maxMonthly?: number;
    maxInitial?: number;
    preferredTerm?: number;
    preferredMileage?: number;
  } | null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{lead.name || "Unknown"}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {lead.email}
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {lead.phone}
                </a>
              )}
            </div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "text-2xl font-bold",
                getScoreColor(lead.score)
              )}
            >
              {lead.score || "?"}/100
            </div>
            <div className="text-xs text-muted-foreground">Lead Score</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* AI Insights */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              AI Analysis
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                {lead.customerType === "business" ? (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="text-sm font-medium capitalize">
                    {lead.customerType || "Unknown"} Customer
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    Intent: {lead.intent || "Unknown"}
                  </div>
                </div>
              </div>

              {(vehiclePrefs?.makes?.length || vehiclePrefs?.bodyTypes?.length) && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Vehicle Interest</div>
                    <div className="text-xs text-muted-foreground">
                      {[
                        ...(vehiclePrefs.makes || []),
                        ...(vehiclePrefs.models || []),
                        ...(vehiclePrefs.bodyTypes || []),
                        ...(vehiclePrefs.fuelTypes || []),
                      ].join(", ") || "Not specified"}
                    </div>
                  </div>
                </div>
              )}

              {(budget?.maxMonthly || budget?.preferredTerm) && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Wallet className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Budget</div>
                    <div className="text-xs text-muted-foreground">
                      {budget.maxMonthly && `£${budget.maxMonthly}/mo`}
                      {budget.maxMonthly && budget.preferredTerm && " • "}
                      {budget.preferredTerm && `${budget.preferredTerm} months`}
                      {budget.preferredMileage &&
                        ` • ${budget.preferredMileage.toLocaleString()} miles`}
                    </div>
                  </div>
                </div>
              )}

              {lead.timeline && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Timeline</div>
                    <div className="text-xs text-muted-foreground">
                      {lead.timeline}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {lead.scoreReasons && (lead.scoreReasons as string[]).length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Score Breakdown
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {(lead.scoreReasons as string[]).map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Original Enquiry */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Original Enquiry
            </h3>
            <div className="p-4 rounded-lg border bg-muted/30 text-sm whitespace-pre-wrap">
              {lead.rawData &&
                (typeof lead.rawData === "object"
                  ? String((lead.rawData as Record<string, unknown>).message ||
                    (lead.rawData as Record<string, unknown>).enquiry ||
                    JSON.stringify(lead.rawData, null, 2))
                  : String(lead.rawData))}
            </div>
            <div className="text-xs text-muted-foreground">
              Received {formatDate(lead.createdAt)} via {lead.source || "website"}
            </div>
          </div>
        </div>

        {/* AI Draft Response */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Draft Response
            </h3>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")}
              />
              Regenerate
            </button>
          </div>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="AI-generated response will appear here..."
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              Review and edit before sending. Add your signature.
            </p>
            <button
              onClick={handleSend}
              disabled={isSending || !lead.email || !draftText}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {isSending ? "Sending..." : "Send Response"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
