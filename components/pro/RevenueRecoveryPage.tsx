"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type RecoveryStage =
  | "FOLLOW_UP_DUE"
  | "HOT_ENGAGEMENT"
  | "STALE_NO_VIEW"
  | "OPEN_MONITORING";

type RecoveryItem = {
  id: string;
  title: string;
  publicUrl: string;
  status: "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED" | "DRAFT";
  contactName: string;
  contactEmail: string | null;
  opportunityTitle: string;
  estimatedValue: number;
  estimatedValueSource: string;
  priorityScore: number;
  stage: RecoveryStage;
  stageLabel: string;
  primaryReason: string;
  sentAt: string | null;
  viewedAt: string | null;
  lastEmailSentAt: string | null;
  daysSinceLastTouch: number | null;
  viewCount: number;
  optionFocusCount: number;
  needsFollowUp: boolean;
  followUpReason: string | null;
  followUpSendCount: number;
  maxFollowUps: number;
  mostFocusedOption: {
    optionId: string | null;
    tier: "GOOD" | "BETTER" | "BEST" | null;
    title: string | null;
    count: number;
    lastFocusedAt: string;
  } | null;
};

type RevenueRecoveryProps = {
  metrics: {
    openProposalCount: number;
    totalOpenValue: number;
    followUpDueCount: number;
    followUpDueValue: number;
    hotEngagementCount: number;
    hotEngagementValue: number;
    staleNoViewCount: number;
    staleNoViewValue: number;
    recoveredThisMonthCount: number;
    recoveredThisMonthValue: number;
  };
  queues: {
    followUpDue: RecoveryItem[];
    hotEngagement: RecoveryItem[];
    staleNoView: RecoveryItem[];
    allOpen: RecoveryItem[];
  };
  settings: {
    followUpDays: number;
    maxFollowUps: number;
  };
};

type QueueKey = keyof RevenueRecoveryProps["queues"];

const queueLabels: Record<QueueKey, string> = {
  followUpDue: "Follow-up due",
  hotEngagement: "Hot engagement",
  staleNoView: "Stale no-view",
  allOpen: "All open",
};

export default function RevenueRecoveryPage({
  metrics,
  queues,
  settings,
}: RevenueRecoveryProps) {
  const router = useRouter();
  const [activeQueue, setActiveQueue] = useState<QueueKey>("followUpDue");
  const [message, setMessage] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const activeItems = queues[activeQueue];
  const nextBestAction = useMemo(
    () => queues.followUpDue[0] || queues.hotEngagement[0] || queues.staleNoView[0] || null,
    [queues.followUpDue, queues.hotEngagement, queues.staleNoView],
  );

  async function copyProposalLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Proposal link copied.");
    } catch {
      setMessage(url);
    }
  }

  async function sendFollowUp(proposalId: string) {
    setSendingId(proposalId);
    setMessage(null);

    try {
      const res = await fetch(`/api/pro/proposals/${proposalId}/send-follow-up`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send follow-up");
      }

      setMessage(
        data.eventType === "FOLLOW_UP_SENT"
          ? `Follow-up sent to ${data.to}.`
          : `Proposal email sent to ${data.to}.`,
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
            Revenue Recovery
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[color:var(--text)]">
            Recover unsold HVAC proposals
          </h1>
          <p className="mt-2 max-w-3xl text-[color:var(--muted)]">
            Work the proposals most likely to fall through the cracks: stale sends,
            homeowners who viewed, and packages with strong option focus.
          </p>
        </div>
        <Link
          href="/pro/proposals"
          className="rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-2 text-sm font-semibold text-[#001]"
        >
          Open Proposal Workspace
        </Link>
      </div>

      {message && (
        <div className="rounded-lg border border-[color:var(--border)] bg-white/5 px-4 py-3 text-sm text-[color:var(--muted)]">
          {message}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricBlock
          label="Open value at risk"
          value={formatCurrency(metrics.totalOpenValue)}
          sublabel={`${metrics.openProposalCount} open proposals`}
          tone="neutral"
        />
        <MetricBlock
          label="Follow-up due"
          value={formatCurrency(metrics.followUpDueValue)}
          sublabel={`${metrics.followUpDueCount} proposals`}
          tone={metrics.followUpDueCount > 0 ? "warn" : "good"}
        />
        <MetricBlock
          label="Hot engagement"
          value={formatCurrency(metrics.hotEngagementValue)}
          sublabel={`${metrics.hotEngagementCount} proposals`}
          tone={metrics.hotEngagementCount > 0 ? "good" : "neutral"}
        />
        <MetricBlock
          label="Stale no-view"
          value={formatCurrency(metrics.staleNoViewValue)}
          sublabel={`${metrics.staleNoViewCount} proposals`}
          tone={metrics.staleNoViewCount > 0 ? "warn" : "neutral"}
        />
        <MetricBlock
          label="Recovered this month"
          value={formatCurrency(metrics.recoveredThisMonthValue)}
          sublabel={`${metrics.recoveredThisMonthCount} accepted`}
          tone={metrics.recoveredThisMonthValue > 0 ? "good" : "neutral"}
        />
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_2fr]">
          <div>
            <h2 className="text-xl font-semibold text-[color:var(--text)]">
              Next best action
            </h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Follow-up threshold: {settings.followUpDays} day
              {settings.followUpDays === 1 ? "" : "s"}. Max follow-ups:{" "}
              {settings.maxFollowUps}.
            </p>
          </div>

          {nextBestAction ? (
            <div className="rounded-lg border border-[color:var(--border)] bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <StageBadge stage={nextBestAction.stage} label={nextBestAction.stageLabel} />
                  <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">
                    {nextBestAction.title}
                  </p>
                  <p className="text-sm text-[color:var(--muted)]">
                    {nextBestAction.contactName} / {nextBestAction.opportunityTitle}
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    {nextBestAction.primaryReason}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[color:var(--text)]">
                    {formatCurrency(nextBestAction.estimatedValue)}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {nextBestAction.estimatedValueSource}
                  </p>
                </div>
              </div>
              <ActionBar
                item={nextBestAction}
                sending={sendingId === nextBestAction.id}
                onSendFollowUp={() => sendFollowUp(nextBestAction.id)}
                onCopyLink={() => copyProposalLink(nextBestAction.publicUrl)}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-[color:var(--border)] bg-white/5 p-4 text-sm text-[color:var(--muted)]">
              No open recovery candidates right now.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]">
        <div className="border-b border-[color:var(--border)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--text)]">
                Recovery Queue
              </h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Sorted by priority, engagement, age, and estimated proposal value.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(queueLabels) as QueueKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveQueue(key)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    activeQueue === key
                      ? "border-[color:var(--accent)] bg-white/10 text-[color:var(--text)]"
                      : "border-[color:var(--border)] text-[color:var(--muted)] hover:bg-white/5"
                  }`}
                >
                  {queueLabels[key]} ({queues[key].length})
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeItems.length === 0 ? (
          <p className="p-5 text-[color:var(--muted)]">
            No proposals in this queue.
          </p>
        ) : (
          <div className="divide-y divide-[color:var(--border)]">
            {activeItems.map((item) => (
              <RecoveryRow
                key={item.id}
                item={item}
                sending={sendingId === item.id}
                onSendFollowUp={() => sendFollowUp(item.id)}
                onCopyLink={() => copyProposalLink(item.publicUrl)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string;
  sublabel: string;
  tone: "good" | "warn" | "neutral";
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-[color:var(--text)]";

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
      <p className="text-sm text-[color:var(--muted)]">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneCls}`}>{value}</p>
      <p className="mt-1 text-xs text-[color:var(--muted)]">{sublabel}</p>
    </div>
  );
}

function RecoveryRow({
  item,
  sending,
  onSendFollowUp,
  onCopyLink,
}: {
  item: RecoveryItem;
  sending: boolean;
  onSendFollowUp: () => Promise<void>;
  onCopyLink: () => Promise<void>;
}) {
  return (
    <article className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[1.3fr_1fr_0.8fr_auto] xl:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={item.stage} label={item.stageLabel} />
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-[color:var(--muted)]">
            Score {item.priorityScore}
          </span>
        </div>
        <h3 className="mt-2 font-semibold text-[color:var(--text)]">
          {item.title}
        </h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {item.contactName} / {item.opportunityTitle}
        </p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          {item.primaryReason}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:grid-cols-2">
        <Signal label="Views" value={String(item.viewCount)} />
        <Signal label="Focus" value={String(item.optionFocusCount)} />
        <Signal
          label="Last touch"
          value={
            item.daysSinceLastTouch === null
              ? "-"
              : `${item.daysSinceLastTouch}d ago`
          }
        />
        <Signal
          label="Follow-ups"
          value={`${item.followUpSendCount}/${item.maxFollowUps}`}
        />
      </div>

      <div>
        <p className="text-2xl font-bold text-[color:var(--text)]">
          {formatCurrency(item.estimatedValue)}
        </p>
        <p className="text-xs text-[color:var(--muted)]">
          {item.estimatedValueSource}
        </p>
        {item.mostFocusedOption && (
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            Focus: {[item.mostFocusedOption.tier, item.mostFocusedOption.title]
              .filter(Boolean)
              .join(" - ")}
          </p>
        )}
      </div>

      <ActionBar
        item={item}
        sending={sending}
        onSendFollowUp={onSendFollowUp}
        onCopyLink={onCopyLink}
      />
    </article>
  );
}

function ActionBar({
  item,
  sending,
  onSendFollowUp,
  onCopyLink,
}: {
  item: RecoveryItem;
  sending: boolean;
  onSendFollowUp: () => Promise<void>;
  onCopyLink: () => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-2 xl:justify-end">
      <button
        type="button"
        onClick={onSendFollowUp}
        disabled={sending || item.status === "DRAFT" || item.status === "ACCEPTED"}
        className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/5 disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send follow-up"}
      </button>
      <button
        type="button"
        onClick={onCopyLink}
        className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/5"
      >
        Copy link
      </button>
      <Link
        href={item.publicUrl}
        target="_blank"
        className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/5"
      >
        Open
      </Link>
    </div>
  );
}

function StageBadge({ stage, label }: { stage: RecoveryStage; label: string }) {
  const cls =
    stage === "FOLLOW_UP_DUE"
      ? "bg-amber-500/10 text-amber-300"
      : stage === "HOT_ENGAGEMENT"
        ? "bg-emerald-500/10 text-emerald-300"
        : stage === "STALE_NO_VIEW"
          ? "bg-rose-500/10 text-rose-300"
          : "bg-white/10 text-[color:var(--muted)]";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2">
      <p className="text-xs text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 font-semibold text-[color:var(--text)]">{value}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
