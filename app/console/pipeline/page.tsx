"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/outreach/Button";

type RankedLead = {
  companyId: string;
  companyName: string;
  slug?: string;
  website?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  accountStatus: "PROSPECT" | "QUALIFIED" | "PRO_CUSTOMER" | "CHURNED";
  convertedToCustomerAt: string | null;
  customerUserCount: number;
  score: number;
  qualified: boolean;
  explanation: string;
  topEvidence: Array<{
    code: string;
    label: string;
    points: number;
    detail?: string | null;
  }>;
};

type DraftMessage = {
  id: string;
  status: string;
  subject: string;
  body: string;
  companyId: string;
};

export default function PipelinePage() {
  const [leads, setLeads] = useState<RankedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(70);
  const [creatingDraftFor, setCreatingDraftFor] = useState<string | null>(null);
  const [convertingCompanyId, setConvertingCompanyId] = useState<string | null>(
    null,
  );
  const [conversionMessage, setConversionMessage] = useState<string | null>(
    null,
  );

  // Google Places importer state
  const [placesQuery, setPlacesQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Draft modal state
  const [activeDraft, setActiveDraft] = useState<DraftMessage | null>(null);
  const [draftAction, setDraftAction] = useState<"approve" | "send" | null>(
    null,
  );

  async function fetchRanked() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/sales-machine/leads/ranked?minScore=${minScore}&limit=50`,
      );
      const data = await res.json();
      setLeads(data.leads || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRanked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minScore]);

  async function createDraft(companyId: string) {
    try {
      setCreatingDraftFor(companyId);
      const res = await fetch("/api/sales-machine/outreach/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create draft");
        return;
      }
      setActiveDraft(data.draft as DraftMessage);
    } finally {
      setCreatingDraftFor(null);
    }
  }

  async function convertToCustomer(companyId: string) {
    setConvertingCompanyId(companyId);
    setConversionMessage(null);

    try {
      const res = await fetch(
        `/api/sales-machine/companies/${companyId}/convert-to-customer`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to convert company");
      }

      setConversionMessage(
        `${data.company.name} is now an active ORBISY Pro customer workspace. Invite an HVAC owner from Users.`,
      );
      await fetchRanked();
    } catch (error) {
      setConversionMessage(
        error instanceof Error ? error.message : "Unexpected error",
      );
    } finally {
      setConvertingCompanyId(null);
    }
  }

  async function approveDraft(id: string) {
    setDraftAction("approve");
    try {
      const res = await fetch(`/api/sales-machine/outreach/${id}/approve`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to approve draft");
        return;
      }
      setActiveDraft((prev) => (prev ? { ...prev, status: "APPROVED" } : null));
    } finally {
      setDraftAction(null);
    }
  }

  async function sendMessage(id: string) {
    if (
      !confirm(
        "Send this email now? This will deliver the message to the contact.",
      )
    )
      return;
    setDraftAction("send");
    try {
      const res = await fetch(`/api/sales-machine/outreach/${id}/send`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send message");
        return;
      }
      setActiveDraft((prev) => (prev ? { ...prev, status: "SENT" } : null));
      alert(`Sent! Message ID: ${data.messageId || "n/a"}`);
    } finally {
      setDraftAction(null);
    }
  }

  async function importFromPlaces() {
    if (!placesQuery.trim()) {
      alert("Enter a search query first, e.g. 'HVAC contractor in Dallas TX'");
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/sales-machine/leads/google-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: placesQuery, maxResults: 20 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportResult(`Error: ${data.error}`);
        return;
      }
      setImportResult(
        `Imported ${data.imported} companies from ${data.found} found. ${data.skipped} skipped.`,
      );
      await fetchRanked();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[color:var(--text)]">
          Sales Pipeline
        </h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-[color:var(--muted)]">
            Min score
            <input
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value) || 0)}
              className="ml-2 w-20 rounded-lg border border-[color:var(--border)] bg-white/5 px-2 py-1 text-[color:var(--text)]"
            />
          </label>
          <Button variant="secondary" onClick={fetchRanked}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Google Places Importer */}
      <div className="mb-8 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--text)] mb-3">
          Import from Google Places
        </h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-60">
            <label className="block text-xs text-[color:var(--muted)] mb-1">
              Search query
            </label>
            <input
              type="text"
              value={placesQuery}
              onChange={(e) => setPlacesQuery(e.target.value)}
              placeholder="e.g. HVAC contractor in Dallas TX"
              className="w-full rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)]"
              onKeyDown={(e) => e.key === "Enter" && importFromPlaces()}
            />
          </div>
          <Button onClick={importFromPlaces} disabled={importing}>
            {importing ? "Importing..." : "Import Leads"}
          </Button>
        </div>
        {importResult && (
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            {importResult}
          </p>
        )}
      </div>

      {/* Lead List */}
      {loading ? (
        <p className="text-[color:var(--muted)]">Loading ranked leads...</p>
      ) : leads.length === 0 ? (
        <p className="text-[color:var(--muted)]">
          No ranked leads yet. Import leads above.
        </p>
      ) : (
        <div className="space-y-4">
          {conversionMessage && (
            <div className="rounded-xl border border-[color:var(--border)] bg-white/5 px-4 py-3 text-sm text-[color:var(--muted)]">
              {conversionMessage}
            </div>
          )}
          {leads.map((lead) => (
            <div
              key={lead.companyId}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--text)]">
                    {lead.companyName}
                  </h2>
                  <p className="text-sm text-[color:var(--muted)]">
                    {[lead.city, lead.state].filter(Boolean).join(", ") ||
                      "Location not set"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-[color:var(--border)] bg-white/5 px-3 py-1 text-[color:var(--muted)]">
                      {accountStatusLabel(lead.accountStatus)}
                    </span>
                    {lead.customerUserCount > 0 && (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                        {lead.customerUserCount} workspace user
                        {lead.customerUserCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[color:var(--muted)] underline hover:text-[color:var(--text)]"
                      >
                        {lead.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {lead.slug && (
                      <a
                        href={`/audit/${lead.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[color:var(--accent)] underline hover:opacity-80"
                      >
                        View audit page →
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-[color:var(--accent)]">
                    {lead.score}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                    {lead.qualified ? "Qualified" : "Needs review"}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-[color:var(--muted)]">
                {lead.explanation}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {lead.topEvidence.map((ev) => (
                  <span
                    key={`${lead.companyId}-${ev.code}`}
                    className="rounded-full border border-[color:var(--border)] bg-white/5 px-3 py-1 text-xs text-[color:var(--muted)]"
                  >
                    {ev.label} ({ev.points > 0 ? "+" : ""}
                    {ev.points})
                  </span>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => createDraft(lead.companyId)}
                    disabled={creatingDraftFor === lead.companyId}
                  >
                    {creatingDraftFor === lead.companyId
                      ? "Creating draft..."
                      : "Create outreach draft"}
                  </Button>
                  {lead.accountStatus !== "PRO_CUSTOMER" ? (
                    <Button
                      variant="secondary"
                      onClick={() => convertToCustomer(lead.companyId)}
                      disabled={convertingCompanyId === lead.companyId}
                    >
                      {convertingCompanyId === lead.companyId
                        ? "Converting..."
                        : "Convert to Pro Customer"}
                    </Button>
                  ) : (
                    <a
                      href={`/console/users?role=HVAC_OWNER&companyId=${lead.companyId}`}
                      className="rounded-lg border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/10"
                    >
                      Invite HVAC Owner
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Draft Modal */}
      {activeDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => e.target === e.currentTarget && setActiveDraft(null)}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[color:var(--text)]">
                Outreach Draft
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    activeDraft.status === "SENT"
                      ? "bg-green-500/20 text-green-400"
                      : activeDraft.status === "APPROVED"
                        ? "bg-blue-500/20 text-blue-400"
                        : activeDraft.status === "SUPPRESSED"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {activeDraft.status}
                </span>
                <button
                  onClick={() => setActiveDraft(null)}
                  className="text-[color:var(--muted)] hover:text-[color:var(--text)] text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-[color:var(--muted)] mb-1 uppercase tracking-wide">
                Subject
              </p>
              <p className="text-sm font-medium text-[color:var(--text)] bg-white/5 rounded-lg px-3 py-2">
                {activeDraft.subject}
              </p>
            </div>

            <div className="mb-6">
              <p className="text-xs text-[color:var(--muted)] mb-1 uppercase tracking-wide">
                Body
              </p>
              <pre className="text-sm text-[color:var(--text)] bg-white/5 rounded-lg px-3 py-3 whitespace-pre-wrap font-sans leading-relaxed">
                {activeDraft.body}
              </pre>
            </div>

            <p className="text-xs text-[color:var(--muted)] mb-4 border-t border-[color:var(--border)] pt-3">
              An unsubscribe link will be appended automatically before sending
              (CAN-SPAM compliant). Suppressed emails are blocked at send time.
            </p>

            <div className="flex gap-3 flex-wrap">
              {activeDraft.status === "DRAFT" && (
                <Button
                  onClick={() => approveDraft(activeDraft.id)}
                  disabled={draftAction === "approve"}
                >
                  {draftAction === "approve" ? "Approving..." : "Approve"}
                </Button>
              )}
              {activeDraft.status === "APPROVED" && (
                <Button
                  onClick={() => sendMessage(activeDraft.id)}
                  disabled={draftAction === "send"}
                >
                  {draftAction === "send" ? "Sending..." : "Send Now"}
                </Button>
              )}
              <Button variant="secondary" onClick={() => setActiveDraft(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function accountStatusLabel(status: RankedLead["accountStatus"]) {
  if (status === "PRO_CUSTOMER") return "ORBISY Pro customer";
  if (status === "QUALIFIED") return "Qualified prospect";
  if (status === "CHURNED") return "Inactive customer";
  return "Prospect";
}
