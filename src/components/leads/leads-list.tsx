"use client";

import { useState } from "react";
import { cn, formatDate, getScoreColor, getScoreBg } from "@/lib/utils";
import type { leads } from "@/lib/db/schema";
import { LeadDetail } from "./lead-detail";
import { Mail, Phone, Clock, Flame } from "lucide-react";

type Lead = typeof leads.$inferSelect;

type LeadsListProps = {
  leads: Lead[];
};

export function LeadsList({ leads }: LeadsListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    leads[0]?.id || null
  );

  const selectedLead = leads.find((l) => l.id === selectedId);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center border rounded-lg bg-card">
        <Mail className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-1">No leads yet</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Leads will appear here when customers submit enquiries through your
          website or connected portals.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Lead list */}
      <div className="w-96 border rounded-lg bg-card overflow-hidden flex flex-col">
        <div className="border-b px-4 py-3">
          <input
            type="text"
            placeholder="Search leads..."
            className="w-full px-3 py-1.5 text-sm border rounded-md bg-background"
          />
        </div>
        <div className="flex-1 overflow-auto">
          {leads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => setSelectedId(lead.id)}
              className={cn(
                "w-full text-left px-4 py-3 border-b transition-colors",
                selectedId === lead.id
                  ? "bg-primary/5 border-l-2 border-l-primary"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {lead.name || "Unknown"}
                    </span>
                    {(lead.score || 0) >= 70 && (
                      <Flame className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {lead.email || "No email"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "text-xs font-medium px-1.5 py-0.5 rounded",
                      getScoreBg(lead.score),
                      getScoreColor(lead.score)
                    )}
                  >
                    {lead.score || "?"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lead.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(lead.createdAt)}
                </span>
                {lead.source && <span>via {lead.source}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lead detail */}
      <div className="flex-1 border rounded-lg bg-card overflow-hidden">
        {selectedLead ? (
          <LeadDetail lead={selectedLead} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a lead to view details
          </div>
        )}
      </div>
    </div>
  );
}
