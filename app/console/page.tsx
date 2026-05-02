"use client";

import { useEffect, useState } from "react";

type SummaryMetrics = {
  totalCompanies: number;
  qualifiedCompanies: number;
  totalMessages: number;
  repliedMessages: number;
  readyMessages: number;
  bouncedMessages: number;
  sentThisWeek: number;
  replyRate: number;
  bounceRate: number;
  avgBuyingLikelihood: number;
  hotLeads: number;
  proposalsNeedingFollowUp: number;
  acceptedProposalsThisMonth: number;
  estimatedAcceptedRevenueThisMonth: number;
  byStatus: Record<string, number>;
};

type RankedLead = {
  companyId: string;
  companyName: string;
  score: number;
  buyingLikelihood?: number;
  dealThesis?: string;
  qualified: boolean;
};

export default function ConsolePage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [topLeads, setTopLeads] = useState<RankedLead[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [summaryRes, leadsRes] = await Promise.all([
        fetch("/api/sales-machine/outreach/summary"),
        fetch("/api/sales-machine/leads/ranked?minScore=0&limit=8"),
      ]);

      const summaryJson = await summaryRes.json();
      const leadsJson = await leadsRes.json();

      if (summaryRes.ok) setSummary(summaryJson.metrics);
      if (leadsRes.ok) setTopLeads(leadsJson.leads || []);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <p className="text-[color:var(--muted)]">Loading command center...</p>
    );
  }

  const m = summary;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text)]">
            Command Center
          </h1>
          <p className="text-[color:var(--muted)] mt-2">
            One-screen operating view for lead generation, outreach, and booked
            calls.
          </p>
        </div>
        <a
          href="/console/pipeline"
          className="rounded-xl border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-5 py-3 font-semibold text-[#001] hover:opacity-90"
        >
          Open Pipeline
        </a>
      </div>

      {/* Row 1 — Pipeline counts */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-3">
          Pipeline
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <MetricCard title="Prospects" value={m?.totalCompanies ?? 0} />
          <MetricCard title="Qualified" value={m?.qualifiedCompanies ?? 0} />
          <MetricCard title="Outreach Sent" value={m?.totalMessages ?? 0} />
          <MetricCard title="Replies" value={m?.repliedMessages ?? 0} />
          <MetricCard title="Ready to Book" value={m?.readyMessages ?? 0} />
        </div>
      </div>

      {/* Row 2 — Buying likelihood & hot leads */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-3">
          Buying signals
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Avg Buying Likelihood"
            value={m?.avgBuyingLikelihood ?? 0}
            suffix="%"
            highlight={
              (m?.avgBuyingLikelihood ?? 0) >= 60
                ? "good"
                : (m?.avgBuyingLikelihood ?? 0) >= 40
                  ? "warn"
                  : "muted"
            }
          />
          <MetricCard
            title="Hot Leads (≥70%)"
            value={m?.hotLeads ?? 0}
            highlight={(m?.hotLeads ?? 0) > 0 ? "good" : "muted"}
          />
          <MetricCard
            title="Reply Rate"
            value={m?.replyRate ?? 0}
            suffix="%"
            highlight={
              (m?.replyRate ?? 0) >= 10
                ? "good"
                : (m?.replyRate ?? 0) >= 4
                  ? "warn"
                  : "muted"
            }
          />
          <MetricCard
            title="Bounce Rate"
            value={m?.bounceRate ?? 0}
            suffix="%"
            highlight={
              (m?.bounceRate ?? 0) <= 3
                ? "good"
                : (m?.bounceRate ?? 0) <= 8
                  ? "warn"
                  : "bad"
            }
          />
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <p className="text-sm text-[color:var(--muted)]">Proposals Needing Follow-Up</p>
            <p className="text-3xl font-bold mt-2 text-yellow-400">
              {(m?.proposalsNeedingFollowUp ?? 0).toLocaleString()}
            </p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--muted)]">
              Managed in Pro Workspace
            </p>
          </div>
          <MetricCard
            title="Accepted This Month"
            value={m?.acceptedProposalsThisMonth ?? 0}
            highlight={(m?.acceptedProposalsThisMonth ?? 0) > 0 ? "good" : "muted"}
          />
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
            <p className="text-sm text-[color:var(--muted)]">Accepted Revenue This Month</p>
            <p className="text-3xl font-bold mt-2 text-emerald-400">
              ${(m?.estimatedAcceptedRevenueThisMonth ?? 0).toLocaleString()}
            </p>
            <p className="mt-3 text-sm font-semibold text-[color:var(--muted)]">
              Managed in Pro Workspace
            </p>
          </div>
        </div>
      </div>

      {/* Row 3 — Weekly activity + funnel health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <h2 className="text-base font-semibold text-[color:var(--text)] mb-1">
            Weekly activity
          </h2>
          <p className="text-sm text-[color:var(--muted)] mb-4">
            Emails sent in the last 7 days
          </p>
          <p className="text-4xl font-bold text-[color:var(--text)]">
            {(m?.sentThisWeek ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-[color:var(--muted)] mt-2">
            {m?.bouncedMessages ?? 0} bounced total · {m?.bounceRate ?? 0}%
            bounce rate
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <h2 className="text-base font-semibold text-[color:var(--text)] mb-1">
            Funnel health
          </h2>
          <p className="text-sm text-[color:var(--muted)] mb-4">
            Focus: improve reply rate and buying-likelihood score
          </p>
          <div className="space-y-2">
            <FunnelRow
              label="Prospects → Qualified"
              a={m?.totalCompanies ?? 0}
              b={m?.qualifiedCompanies ?? 0}
            />
            <FunnelRow
              label="Sent → Replied"
              a={m?.totalMessages ?? 0}
              b={m?.repliedMessages ?? 0}
            />
            <FunnelRow
              label="Replied → Ready"
              a={m?.repliedMessages ?? 0}
              b={m?.readyMessages ?? 0}
            />
          </div>
        </div>
      </div>

      {/* Row 4 — Top scored prospects */}
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-xl font-semibold text-[color:var(--text)] mb-4">
          Top scored prospects
        </h2>
        {topLeads.length === 0 ? (
          <p className="text-[color:var(--muted)]">
            No prospects imported yet.
          </p>
        ) : (
          <div className="space-y-3">
            {topLeads.map((lead) => (
              <div
                key={lead.companyId}
                className="flex items-start justify-between rounded-lg border border-[color:var(--border)] bg-white/5 px-4 py-3 gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[color:var(--text)] truncate">
                    {lead.companyName}
                  </p>
                  {lead.dealThesis && (
                    <p className="text-xs text-[color:var(--muted)] mt-0.5 line-clamp-2">
                      {lead.dealThesis}
                    </p>
                  )}
                  {!lead.dealThesis && (
                    <p className="text-xs text-[color:var(--muted)]">
                      {lead.qualified ? "Qualified" : "Needs review"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {lead.buyingLikelihood !== undefined && (
                    <div className="text-right">
                      <p className="text-xs text-[color:var(--muted)]">
                        Likelihood
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          lead.buyingLikelihood >= 70
                            ? "text-emerald-400"
                            : lead.buyingLikelihood >= 45
                              ? "text-yellow-400"
                              : "text-[color:var(--muted)]"
                        }`}
                      >
                        {lead.buyingLikelihood}%
                      </p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-[color:var(--muted)]">Score</p>
                    <p className="font-bold text-[color:var(--accent)]">
                      {lead.score}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  suffix = "",
  highlight = "muted",
}: {
  title: string;
  value: number;
  suffix?: string;
  highlight?: "good" | "warn" | "bad" | "muted";
}) {
  const colorMap = {
    good: "text-emerald-400",
    warn: "text-yellow-400",
    bad: "text-red-400",
    muted: "text-[color:var(--text)]",
  };
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
      <p className="text-sm text-[color:var(--muted)]">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colorMap[highlight]}`}>
        {value.toLocaleString()}
        {suffix}
      </p>
    </div>
  );
}

function FunnelRow({ label, a, b }: { label: string; a: number; b: number }) {
  const pct = a > 0 ? Math.round((b / a) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between text-xs text-[color:var(--muted)] mb-1">
          <span>{label}</span>
          <span>
            {b} / {a} ({pct}%)
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[color:var(--accent)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
