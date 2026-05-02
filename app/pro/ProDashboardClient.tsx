"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type QuickProposal = {
  id: string;
  title: string;
  publicUrl: string;
  status: "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED" | "DRAFT";
  contactName: string;
  opportunityTitle: string;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  followUpReason: string | null;
  daysSinceLastTouch: number | null;
  viewCount: number;
  optionFocusCount: number;
  mostFocusedOption: {
    tier: "GOOD" | "BETTER" | "BEST" | null;
    title: string | null;
    count: number;
  } | null;
};

type ActivityItem = {
  id: string;
  eventType: string;
  occurredAt: string;
  proposalId: string;
  proposalTitle: string;
  publicUrl: string;
  contactName: string;
  detail: string | null;
};

type DashboardMetrics = {
  activeProposals: number;
  proposalsViewed: number;
  proposalsNeedingFollowUp: number;
  acceptedProposalsThisMonth: number;
  estimatedAcceptedRevenueThisMonth: number;
  followUpsSent: number;
};

export default function ProDashboardClient({
  metrics,
  mostEngagedOpenProposals,
  needsFollowUp,
  viewedNoDecision,
  strongFocusNoDecision,
  recentActivity,
}: {
  metrics: DashboardMetrics;
  mostEngagedOpenProposals: QuickProposal[];
  needsFollowUp: QuickProposal[];
  viewedNoDecision: QuickProposal[];
  strongFocusNoDecision: QuickProposal[];
  recentActivity: ActivityItem[];
}) {
  const router = useRouter();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [sendingProposalId, setSendingProposalId] = useState<string | null>(
    null,
  );

  const firstFollowUpCandidate = needsFollowUp[0] || null;
  const firstCopyCandidate =
    mostEngagedOpenProposals[0] || needsFollowUp[0] || null;

  async function copyProposalLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setActionMessage("Proposal link copied.");
    } catch {
      setActionMessage(url);
    }
  }

  async function sendFollowUpNow(proposalId: string) {
    setSendingProposalId(proposalId);
    setActionMessage(null);

    try {
      const res = await fetch(
        `/api/pro/proposals/${proposalId}/send-follow-up`,
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send follow-up");
      }

      setActionMessage(
        data.eventType === "FOLLOW_UP_SENT"
          ? `Follow-up sent to ${data.to}.`
          : `Proposal email sent to ${data.to}.`,
      );
      router.refresh();
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Unexpected error",
      );
    } finally {
      setSendingProposalId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text)]">
            Pro Dashboard
          </h1>
          <p className="mt-2 text-[color:var(--muted)]">
            Operational view of proposal activity, follow-up risk, and recovered
            revenue for your HVAC workspace.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-lg border border-[color:var(--border)] bg-white/5 px-4 py-3 text-sm text-[color:var(--muted)]">
          {actionMessage}
        </div>
      )}

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Core Metrics
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            title="Active Proposals"
            value={metrics.activeProposals}
          />
          <MetricCard
            title="Proposals Viewed"
            value={metrics.proposalsViewed}
          />
          <MetricCard
            title="Need Follow-Up"
            value={metrics.proposalsNeedingFollowUp}
            highlight={metrics.proposalsNeedingFollowUp > 0 ? "warn" : "good"}
          />
          <MetricCard
            title="Accepted This Month"
            value={metrics.acceptedProposalsThisMonth}
            highlight={
              metrics.acceptedProposalsThisMonth > 0 ? "good" : "muted"
            }
          />
          <MetricCard
            title="Accepted Revenue"
            value={`$${metrics.estimatedAcceptedRevenueThisMonth.toLocaleString()}`}
            highlight={
              metrics.estimatedAcceptedRevenueThisMonth > 0 ? "good" : "muted"
            }
          />
          <MetricCard title="Follow-Ups Sent" value={metrics.followUpsSent} />
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">
            Quick Actions
          </h2>
          <Link
            href="/pro/proposals"
            className="text-sm font-semibold text-[color:var(--accent)] hover:opacity-90"
          >
            Open full proposal workspace
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/pro/proposals"
            className="rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-3 text-center font-semibold text-[#001]"
          >
            Create Proposal
          </Link>
          <Link
            href="/pro/proposals"
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-4 py-3 text-center font-semibold text-[color:var(--text)] hover:bg-white/10"
          >
            Open Proposal Builder
          </Link>
          <button
            type="button"
            disabled={!firstFollowUpCandidate || !!sendingProposalId}
            onClick={() =>
              firstFollowUpCandidate &&
              sendFollowUpNow(firstFollowUpCandidate.id)
            }
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-4 py-3 text-center font-semibold text-[color:var(--text)] hover:bg-white/10 disabled:opacity-50"
          >
            {sendingProposalId === firstFollowUpCandidate?.id
              ? "Sending..."
              : "Send Follow-Up Now"}
          </button>
          <button
            type="button"
            disabled={!firstCopyCandidate}
            onClick={() =>
              firstCopyCandidate &&
              copyProposalLink(firstCopyCandidate.publicUrl)
            }
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-4 py-3 text-center font-semibold text-[color:var(--text)] hover:bg-white/10 disabled:opacity-50"
          >
            Copy Proposal Link
          </button>
        </div>
      </section>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Most-Engaged Open Proposals
        </p>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
          {mostEngagedOpenProposals.length === 0 ? (
            <p className="text-[color:var(--muted)]">
              No open proposal engagement yet.
            </p>
          ) : (
            <div className="space-y-3">
              {mostEngagedOpenProposals.map((proposal) => (
                <ProposalRow
                  key={proposal.id}
                  proposal={proposal}
                  sending={sendingProposalId === proposal.id}
                  onSendFollowUp={() => sendFollowUpNow(proposal.id)}
                  onCopyLink={() => copyProposalLink(proposal.publicUrl)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Needs Attention
        </p>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <NeedsAttentionCard
            title="Needs follow-up now"
            subtitle="Sent/viewed proposals at risk"
            items={needsFollowUp}
            sendingProposalId={sendingProposalId}
            onSendFollowUp={sendFollowUpNow}
            onCopyLink={copyProposalLink}
          />
          <NeedsAttentionCard
            title="Viewed but no decision"
            subtitle="Homeowners opened proposal, no acceptance yet"
            items={viewedNoDecision}
            sendingProposalId={sendingProposalId}
            onSendFollowUp={sendFollowUpNow}
            onCopyLink={copyProposalLink}
          />
          <NeedsAttentionCard
            title="Strong option focus"
            subtitle="High option interest, no decision"
            items={strongFocusNoDecision}
            sendingProposalId={sendingProposalId}
            onSendFollowUp={sendFollowUpNow}
            onCopyLink={copyProposalLink}
          />
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
        <h2 className="text-xl font-semibold text-[color:var(--text)]">
          Recent Activity
        </h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Proposal sent, viewed, option focus, follow-up, and decision events.
        </p>

        {recentActivity.length === 0 ? (
          <p className="mt-4 text-[color:var(--muted)]">
            No recent proposal activity.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[color:var(--border)] bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[color:var(--text)]">
                    {eventLabel(item.eventType)}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {formatDateTime(item.occurredAt)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {item.proposalTitle} - {item.contactName}
                </p>
                {item.detail && (
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    {item.detail}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => copyProposalLink(item.publicUrl)}
                    className="font-semibold text-[color:var(--accent)] hover:opacity-90"
                  >
                    Copy proposal link
                  </button>
                  <Link
                    href={item.publicUrl}
                    target="_blank"
                    className="font-semibold text-[color:var(--accent)] hover:opacity-90"
                  >
                    Open proposal
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  highlight = "muted",
}: {
  title: string;
  value: number | string;
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
      <p className={`mt-2 text-3xl font-bold ${colorMap[highlight]}`}>
        {value}
      </p>
    </div>
  );
}

function NeedsAttentionCard({
  title,
  subtitle,
  items,
  sendingProposalId,
  onSendFollowUp,
  onCopyLink,
}: {
  title: string;
  subtitle: string;
  items: QuickProposal[];
  sendingProposalId: string | null;
  onSendFollowUp: (proposalId: string) => Promise<void>;
  onCopyLink: (publicUrl: string) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
      <h3 className="text-lg font-semibold text-[color:var(--text)]">
        {title}
      </h3>
      <p className="mt-1 text-xs text-[color:var(--muted)]">{subtitle}</p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--muted)]">
          No proposals in this queue.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.slice(0, 5).map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-lg border border-[color:var(--border)] bg-white/5 p-3"
            >
              <p className="font-medium text-[color:var(--text)]">
                {proposal.title}
              </p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                {proposal.contactName} - {proposal.opportunityTitle}
              </p>
              {proposal.followUpReason && (
                <p className="mt-1 text-xs text-yellow-300">
                  {proposal.followUpReason}
                </p>
              )}
              {proposal.mostFocusedOption && (
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  Focus: {proposal.mostFocusedOption.tier || "OPTION"} -{" "}
                  {proposal.mostFocusedOption.title || ""} (
                  {proposal.mostFocusedOption.count})
                </p>
              )}
              <div className="mt-2 flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => onSendFollowUp(proposal.id)}
                  disabled={sendingProposalId === proposal.id}
                  className="font-semibold text-[color:var(--accent)] hover:opacity-90 disabled:opacity-50"
                >
                  {sendingProposalId === proposal.id
                    ? "Sending..."
                    : "Send follow-up"}
                </button>
                <button
                  type="button"
                  onClick={() => onCopyLink(proposal.publicUrl)}
                  className="font-semibold text-[color:var(--accent)] hover:opacity-90"
                >
                  Copy link
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalRow({
  proposal,
  sending,
  onSendFollowUp,
  onCopyLink,
}: {
  proposal: QuickProposal;
  sending: boolean;
  onSendFollowUp: () => Promise<void>;
  onCopyLink: () => Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[color:var(--text)]">
            {proposal.title}
          </p>
          <p className="text-sm text-[color:var(--muted)]">
            {proposal.contactName} - {proposal.opportunityTitle}
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Views: {proposal.viewCount} · Option focus events:{" "}
            {proposal.optionFocusCount}
          </p>
        </div>

        <div className="flex gap-3 text-xs">
          <button
            type="button"
            onClick={onSendFollowUp}
            disabled={sending}
            className="font-semibold text-[color:var(--accent)] hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send follow-up"}
          </button>
          <button
            type="button"
            onClick={onCopyLink}
            className="font-semibold text-[color:var(--accent)] hover:opacity-90"
          >
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}

function eventLabel(eventType: string) {
  if (eventType === "SENT") return "Proposal sent";
  if (eventType === "VIEWED") return "Proposal viewed";
  if (eventType === "OPTION_VIEWED") return "Option viewed / focused";
  if (eventType === "FOLLOW_UP_SENT") return "Follow-up sent";
  if (eventType === "EMAIL_SENT") return "Initial proposal email sent";
  if (eventType === "ACCEPTED") return "Proposal accepted";
  if (eventType === "DECLINED") return "Proposal declined";
  return eventType.replaceAll("_", " ").toLowerCase();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}
