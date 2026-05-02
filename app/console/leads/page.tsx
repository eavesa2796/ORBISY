"use client";

import { useEffect, useState } from "react";

type Lead = {
  companyId: string;
  companyName: string;
  slug?: string;
  city?: string;
  state?: string;
  accountStatus: "PROSPECT" | "QUALIFIED" | "PRO_CUSTOMER" | "CHURNED";
  convertedToCustomerAt: string | null;
  customerUserCount: number;
  score: number;
  buyingLikelihood: number;
  qualified: boolean;
  explanation: string;
  dealThesis?: string;
  thesisConfidence: number;
};

type AuditState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; delta: number | null; buyingLikelihood: number }
  | { status: "error"; message: string };

export default function ProspectsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [minScore, setMinScore] = useState(60);
  const [loading, setLoading] = useState(true);
  const [auditStates, setAuditStates] = useState<Record<string, AuditState>>(
    {},
  );
  const [convertingCompanyId, setConvertingCompanyId] = useState<string | null>(
    null,
  );
  const [conversionMessage, setConversionMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minScore]);

  async function fetchLeads() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/sales-machine/leads/ranked?minScore=${minScore}&limit=50`,
      );
      const data = await res.json();
      if (res.ok) setLeads(data.leads || []);
    } finally {
      setLoading(false);
    }
  }

  async function runAudit(companyId: string) {
    setAuditStates((prev) => ({ ...prev, [companyId]: { status: "running" } }));
    try {
      const res = await fetch("/api/sales-machine/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setAuditStates((prev) => ({
        ...prev,
        [companyId]: {
          status: "done",
          delta: data.score?.delta ?? null,
          buyingLikelihood: data.score?.buyingLikelihood ?? 0,
        },
      }));
      // Refresh list so thesis + score update in the card
      await fetchLeads();
    } catch (err) {
      setAuditStates((prev) => ({
        ...prev,
        [companyId]: {
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        },
      }));
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
      await fetchLeads();
    } catch (error) {
      setConversionMessage(
        error instanceof Error ? error.message : "Unexpected error",
      );
    } finally {
      setConvertingCompanyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text)]">
            Prospects
          </h1>
          <p className="text-[color:var(--muted)] mt-2">
            Highest-value HVAC companies ranked by your scoring engine.
          </p>
        </div>
        <a
          href="/console/pipeline"
          className="rounded-xl border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-5 py-3 font-semibold text-[#001] hover:opacity-90"
        >
          Go To Pipeline
        </a>
      </div>

      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
        <label className="text-sm text-[color:var(--muted)]">
          Minimum score
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value) || 0)}
            className="ml-2 w-24 rounded-lg border border-[color:var(--border)] bg-white/5 px-2 py-1 text-[color:var(--text)]"
          />
        </label>
      </div>

      {conversionMessage && (
        <div className="rounded-xl border border-[color:var(--border)] bg-white/5 px-4 py-3 text-sm text-[color:var(--muted)]">
          {conversionMessage}
        </div>
      )}

      {loading ? (
        <p className="text-[color:var(--muted)]">Loading prospects...</p>
      ) : leads.length === 0 ? (
        <p className="text-[color:var(--muted)]">
          No prospects match this score yet.
        </p>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.companyId}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-[color:var(--text)]">
                    {lead.companyName}
                  </p>
                  <p className="text-sm text-[color:var(--muted)]">
                    {[lead.city, lead.state].filter(Boolean).join(", ") ||
                      "Unknown location"}
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
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-[color:var(--accent)]">
                    {lead.score}
                  </p>
                  <p className="text-xs text-[color:var(--muted)] uppercase tracking-wide">
                    {lead.qualified ? "Qualified" : "Review"}
                  </p>
                </div>
              </div>

              {/* Buying likelihood bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-[color:var(--muted)] mb-1">
                  <span>Buying likelihood</span>
                  <span className="font-semibold text-[color:var(--accent-2)]">
                    {lead.buyingLikelihood}/100
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[color:var(--accent-2)]"
                    style={{ width: `${lead.buyingLikelihood}%` }}
                  />
                </div>
              </div>

              {/* Deal thesis */}
              {lead.dealThesis && lead.thesisConfidence > 0 ? (
                <p className="mt-3 text-sm text-[color:var(--muted)] italic border-l-2 border-[color:var(--accent)]/40 pl-3">
                  {lead.dealThesis}
                </p>
              ) : (
                <p className="mt-3 text-xs text-[color:var(--muted)]/60 italic">
                  No deal thesis yet — run a website audit to generate one.
                </p>
              )}

              {/* Audit actions */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {(() => {
                  const state = auditStates[lead.companyId] ?? {
                    status: "idle",
                  };
                  return (
                    <>
                      <button
                        onClick={() => runAudit(lead.companyId)}
                        disabled={state.status === "running"}
                        className="rounded-lg border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-medium text-[color:var(--text)] hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {state.status === "running" ? "Auditing…" : "Run Audit"}
                      </button>
                      {state.status === "done" && (
                        <span className="text-sm text-[color:var(--accent-2)]">
                          ✓ Done
                          {state.delta !== null && state.delta !== 0 && (
                            <span
                              className={
                                state.delta > 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }
                            >
                              {" "}
                              ({state.delta > 0 ? "+" : ""}
                              {state.delta} pts)
                            </span>
                          )}
                        </span>
                      )}
                      {state.status === "error" && (
                        <span className="text-sm text-red-400">
                          ✗ {state.message}
                        </span>
                      )}
                    </>
                  );
                })()}
                {lead.slug ? (
                  <a
                    href={`/audit/${lead.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[color:var(--accent)] underline"
                  >
                    Open Public Audit
                  </a>
                ) : null}
                {lead.accountStatus !== "PRO_CUSTOMER" ? (
                  <button
                    type="button"
                    onClick={() => convertToCustomer(lead.companyId)}
                    disabled={convertingCompanyId === lead.companyId}
                    className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {convertingCompanyId === lead.companyId
                      ? "Converting..."
                      : "Convert to Pro Customer"}
                  </button>
                ) : (
                  <a
                    href={`/console/users?role=HVAC_OWNER&companyId=${lead.companyId}`}
                    className="rounded-lg border border-[color:var(--border)] bg-white/5 px-4 py-2 text-sm font-medium text-[color:var(--text)] transition-colors hover:bg-white/10"
                  >
                    Invite HVAC Owner
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function accountStatusLabel(
  status: Lead["accountStatus"],
) {
  if (status === "PRO_CUSTOMER") return "ORBISY Pro customer";
  if (status === "QUALIFIED") return "Qualified prospect";
  if (status === "CHURNED") return "Inactive customer";
  return "Prospect";
}
