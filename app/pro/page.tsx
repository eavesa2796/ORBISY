import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/session";
import {
  buildInternalPublicProposalUrl,
  getProposalFollowUpDays,
  getProposalMaxFollowUps,
  serializeInternalProposal,
  type InternalProposalRecord,
} from "@/lib/sales/proposals/internal-list";
import ProDashboardClient from "./ProDashboardClient";

const DASHBOARD_ACTIVITY_EVENT_TYPES = [
  "SENT",
  "VIEWED",
  "OPTION_VIEWED",
  "EMAIL_SENT",
  "FOLLOW_UP_SENT",
  "ACCEPTED",
  "DECLINED",
] as const;

export default async function ProDashboardPage() {
  const session = await validateSession();
  if (!session) {
    redirect("/login");
  }

  if (!session.customerCompanyId) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
          <h1 className="text-2xl font-bold text-[color:var(--text)]">
            Pro Dashboard
          </h1>
          <p className="mt-2 text-[color:var(--muted)]">
            This account is not linked to an HVAC company workspace yet.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            href="/pro/catalog"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 transition hover:bg-white/5"
          >
            Open Catalog
          </Link>
          <Link
            href="/pro/proposals"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 transition hover:bg-white/5"
          >
            Open Proposal Builder
          </Link>
          <Link
            href="/pro/proposals/settings"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 transition hover:bg-white/5"
          >
            Open Pricing Settings
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const followUpDays = getProposalFollowUpDays();
  const maxFollowUps = getProposalMaxFollowUps();

  const baseUrl =
    process.env.NEXT_PUBLIC_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const proposals = await prisma.salesProposal.findMany({
    where: { companyId: session.customerCompanyId },
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
      },
      events: {
        where: {
          eventType: {
            in: ["EMAIL_SENT", "FOLLOW_UP_SENT", "VIEWED", "OPTION_VIEWED"],
          },
        },
        orderBy: { occurredAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const serializedProposals = proposals.map((proposal) =>
    serializeInternalProposal(
      proposal as unknown as InternalProposalRecord,
      baseUrl,
      {
        now,
        followUpDays,
        maxFollowUps,
      },
    ),
  );

  const openProposals = serializedProposals.filter(
    (proposal) => proposal.status === "SENT" || proposal.status === "VIEWED",
  );

  const metrics = {
    activeProposals: serializedProposals.filter(
      (proposal) =>
        proposal.status !== "ACCEPTED" && proposal.status !== "DECLINED",
    ).length,
    proposalsViewed: serializedProposals.filter(
      (proposal) => proposal.viewCount > 0 || !!proposal.viewedAt,
    ).length,
    proposalsNeedingFollowUp: openProposals.filter(
      (proposal) => proposal.needsFollowUp,
    ).length,
    acceptedProposalsThisMonth: serializedProposals.filter(
      (proposal) => !!proposal.acceptedAt && proposal.acceptedAt >= monthStart,
    ).length,
    estimatedAcceptedRevenueThisMonth: Math.round(
      serializedProposals
        .filter(
          (proposal) =>
            !!proposal.acceptedAt && proposal.acceptedAt >= monthStart,
        )
        .reduce(
          (sum, proposal) =>
            sum + (proposal.selectedOptionSummary?.finalPrice || 0),
          0,
        ),
    ),
    followUpsSent: serializedProposals.reduce(
      (sum, proposal) => sum + proposal.followUpSendCount,
      0,
    ),
  };

  const mapProposalForClient = (
    proposal: (typeof serializedProposals)[number],
  ) => ({
    id: proposal.id,
    title: proposal.title,
    publicUrl: proposal.publicUrl,
    status: proposal.status,
    contactName:
      proposal.contact?.fullName ||
      proposal.contact?.email ||
      proposal.company.name,
    opportunityTitle: proposal.opportunity.title,
    sentAt: proposal.sentAt ? proposal.sentAt.toISOString() : null,
    viewedAt: proposal.viewedAt ? proposal.viewedAt.toISOString() : null,
    acceptedAt: proposal.acceptedAt ? proposal.acceptedAt.toISOString() : null,
    followUpReason: proposal.followUpReason,
    daysSinceLastTouch: proposal.daysSinceLastTouch,
    viewCount: proposal.viewCount,
    optionFocusCount: proposal.optionFocusCount,
    mostFocusedOption: proposal.mostFocusedOption
      ? {
          tier: proposal.mostFocusedOption.tier,
          title: proposal.mostFocusedOption.title,
          count: proposal.mostFocusedOption.count,
        }
      : null,
  });

  const mostEngagedOpenProposals = openProposals
    .map((proposal) => ({
      proposal,
      score:
        proposal.viewCount * 2 +
        proposal.optionFocusCount * 3 +
        (proposal.mostFocusedOption?.count || 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => mapProposalForClient(entry.proposal));

  const needsFollowUp = openProposals
    .filter((proposal) => proposal.needsFollowUp)
    .sort((a, b) => (b.daysSinceLastTouch || 0) - (a.daysSinceLastTouch || 0))
    .slice(0, 8)
    .map(mapProposalForClient);

  const viewedNoDecision = serializedProposals
    .filter((proposal) => proposal.status === "VIEWED")
    .sort((a, b) => {
      const aTime =
        a.lastViewedEventAt?.getTime() || a.viewedAt?.getTime() || 0;
      const bTime =
        b.lastViewedEventAt?.getTime() || b.viewedAt?.getTime() || 0;
      return bTime - aTime;
    })
    .slice(0, 8)
    .map(mapProposalForClient);

  const strongFocusNoDecision = openProposals
    .filter(
      (proposal) =>
        proposal.optionFocusCount >= 2 ||
        (proposal.mostFocusedOption?.count || 0) >= 2,
    )
    .sort((a, b) => {
      const aScore = a.optionFocusCount + (a.mostFocusedOption?.count || 0);
      const bScore = b.optionFocusCount + (b.mostFocusedOption?.count || 0);
      return bScore - aScore;
    })
    .slice(0, 8)
    .map(mapProposalForClient);

  const recentEvents = await prisma.salesProposalEvent.findMany({
    where: {
      eventType: { in: [...DASHBOARD_ACTIVITY_EVENT_TYPES] },
      proposal: { companyId: session.customerCompanyId },
    },
    orderBy: { occurredAt: "desc" },
    take: 25,
    include: {
      proposal: {
        select: {
          id: true,
          title: true,
          publicToken: true,
          company: { select: { name: true } },
          contact: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  const recentActivity = recentEvents.map((event) => {
    const metadata =
      event.metadata &&
      typeof event.metadata === "object" &&
      !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : null;

    let detail: string | null = null;
    if (event.eventType === "OPTION_VIEWED") {
      const tier = typeof metadata?.tier === "string" ? metadata.tier : null;
      const title = typeof metadata?.title === "string" ? metadata.title : null;
      if (tier || title) {
        detail = `Focused option: ${[tier, title].filter(Boolean).join(" - ")}`;
      }
    }

    if (
      event.eventType === "FOLLOW_UP_SENT" ||
      event.eventType === "EMAIL_SENT"
    ) {
      const to = typeof metadata?.to === "string" ? metadata.to : null;
      if (to) {
        detail = `Delivered to ${to}`;
      }
    }

    return {
      id: event.id,
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString(),
      proposalId: event.proposal.id,
      proposalTitle: event.proposal.title,
      publicUrl: buildInternalPublicProposalUrl(
        baseUrl,
        event.proposal.publicToken,
      ),
      contactName:
        event.proposal.contact?.fullName ||
        event.proposal.contact?.email ||
        event.proposal.company.name,
      detail,
    };
  });

  return (
    <ProDashboardClient
      metrics={metrics}
      mostEngagedOpenProposals={mostEngagedOpenProposals}
      needsFollowUp={needsFollowUp}
      viewedNoDecision={viewedNoDecision}
      strongFocusNoDecision={strongFocusNoDecision}
      recentActivity={recentActivity}
    />
  );
}
