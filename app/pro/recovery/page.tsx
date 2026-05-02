import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/session";
import {
  getProposalFollowUpDays,
  getProposalMaxFollowUps,
  serializeInternalProposal,
  type InternalProposalRecord,
} from "@/lib/sales/proposals/internal-list";
import { buildRevenueRecoveryDashboard } from "@/lib/sales/proposals/revenue-recovery";
import RevenueRecoveryPage from "@/components/pro/RevenueRecoveryPage";

export default async function ProRevenueRecoveryPage() {
  const session = await validateSession();
  if (!session) {
    redirect("/login?callbackUrl=/pro/recovery");
  }

  if (!session.customerCompanyId) {
    return (
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <h1 className="text-2xl font-bold text-[color:var(--text)]">
          Revenue Recovery
        </h1>
        <p className="mt-2 text-[color:var(--muted)]">
          This account is not linked to an HVAC company workspace yet.
        </p>
        <Link
          href="/pro"
          className="mt-4 inline-flex rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-white/5"
        >
          Back to Pro Dashboard
        </Link>
      </div>
    );
  }

  const now = new Date();
  const followUpDays = getProposalFollowUpDays();
  const maxFollowUps = getProposalMaxFollowUps();
  const baseUrl =
    process.env.NEXT_PUBLIC_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const proposals = await prisma.salesProposal.findMany({
    where: {
      companyId: session.customerCompanyId,
      status: { in: ["SENT", "VIEWED", "ACCEPTED", "DECLINED"] },
    },
    include: {
      opportunity: { select: { id: true, title: true } },
      company: { select: { id: true, name: true, slug: true } },
      contact: { select: { id: true, fullName: true, email: true } },
      selectedOption: { select: { id: true, tier: true, title: true } },
      options: {
        select: {
          id: true,
          tier: true,
          title: true,
          summary: true,
          equipmentSnapshot: true,
          warrantyLabel: true,
          financingApr: true,
          financingMonths: true,
          monthlyPaymentEstimate: true,
          finalCustomerPrice: true,
          grossMarginPercent: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      events: {
        where: {
          eventType: {
            in: ["EMAIL_SENT", "FOLLOW_UP_SENT", "VIEWED", "OPTION_VIEWED"],
          },
        },
        select: {
          eventType: true,
          occurredAt: true,
          metadata: true,
        },
        orderBy: { occurredAt: "desc" },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 300,
  });

  const serialized = proposals.map((proposal) =>
    serializeInternalProposal(
      proposal as unknown as InternalProposalRecord,
      baseUrl,
      { now, followUpDays, maxFollowUps },
    ),
  );

  const dashboard = buildRevenueRecoveryDashboard(serialized, { now });

  return (
    <RevenueRecoveryPage
      metrics={dashboard.metrics}
      queues={{
        followUpDue: dashboard.queues.followUpDue.map(serializeQueueItemForClient),
        hotEngagement: dashboard.queues.hotEngagement.map(serializeQueueItemForClient),
        staleNoView: dashboard.queues.staleNoView.map(serializeQueueItemForClient),
        allOpen: dashboard.queues.allOpen.map(serializeQueueItemForClient),
      }}
      settings={{ followUpDays, maxFollowUps }}
    />
  );
}

function serializeQueueItemForClient(
  item: ReturnType<typeof buildRevenueRecoveryDashboard>["queues"]["allOpen"][number],
) {
  return {
    ...item,
    sentAt: item.sentAt ? item.sentAt.toISOString() : null,
    viewedAt: item.viewedAt ? item.viewedAt.toISOString() : null,
    lastEmailSentAt: item.lastEmailSentAt ? item.lastEmailSentAt.toISOString() : null,
    mostFocusedOption: item.mostFocusedOption
      ? {
          ...item.mostFocusedOption,
          lastFocusedAt: item.mostFocusedOption.lastFocusedAt.toISOString(),
        }
      : null,
  };
}
