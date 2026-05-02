export type RecoveryProposalInput = {
  id: string;
  opportunityId: string;
  publicToken: string;
  publicUrl: string;
  title: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED";
  createdAt: Date;
  sentAt: Date | null;
  viewedAt: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  opportunity: { id: string; title: string };
  company: { id: string; name: string; slug: string };
  contact: { id: string; fullName: string | null; email: string | null } | null;
  selectedOption: { id: string; tier: "GOOD" | "BETTER" | "BEST"; title: string } | null;
  selectedOptionSummary: {
    id: string;
    tier: "GOOD" | "BETTER" | "BEST";
    title: string;
    equipment: string | null;
    finalPrice: number;
    warranty: string | null;
    financingEstimate: number | null;
    financingApr: number | null;
    financingMonths: number | null;
  } | null;
  lastEmailSentAt: Date | null;
  lastEmailEventType: string | null;
  emailSendCount: number;
  followUpSendCount: number;
  maxFollowUps: number;
  needsFollowUp: boolean;
  followUpReason: string | null;
  daysSinceLastTouch: number | null;
  viewCount: number;
  lastViewedEventAt: Date | null;
  optionFocusCount: number;
  mostFocusedOption: {
    optionId: string | null;
    tier: "GOOD" | "BETTER" | "BEST" | null;
    title: string | null;
    count: number;
    lastFocusedAt: Date;
  } | null;
  options: Array<{
    id: string;
    tier: "GOOD" | "BETTER" | "BEST";
    title: string;
    finalCustomerPrice: number;
    grossMarginPercent?: number;
  }>;
};

export type RecoveryStage =
  | "FOLLOW_UP_DUE"
  | "HOT_ENGAGEMENT"
  | "STALE_NO_VIEW"
  | "OPEN_MONITORING";

export type RecoveryQueueItem = {
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
  sentAt: Date | null;
  viewedAt: Date | null;
  lastEmailSentAt: Date | null;
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
    lastFocusedAt: Date;
  } | null;
};

export type RevenueRecoveryDashboard = {
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
    followUpDue: RecoveryQueueItem[];
    hotEngagement: RecoveryQueueItem[];
    staleNoView: RecoveryQueueItem[];
    allOpen: RecoveryQueueItem[];
  };
};

export function buildRevenueRecoveryDashboard(
  proposals: RecoveryProposalInput[],
  options?: {
    now?: Date;
  },
): RevenueRecoveryDashboard {
  const now = options?.now || new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const openItems = proposals
    .filter((proposal) => proposal.status === "SENT" || proposal.status === "VIEWED")
    .map(toRecoveryQueueItem)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const followUpDue = openItems.filter((item) => item.stage === "FOLLOW_UP_DUE");
  const hotEngagement = openItems.filter((item) => item.stage === "HOT_ENGAGEMENT");
  const staleNoView = openItems.filter((item) => item.stage === "STALE_NO_VIEW");

  const recoveredThisMonth = proposals.filter(
    (proposal) =>
      proposal.status === "ACCEPTED" &&
      proposal.acceptedAt !== null &&
      proposal.acceptedAt >= monthStart,
  );

  return {
    metrics: {
      openProposalCount: openItems.length,
      totalOpenValue: sumValue(openItems),
      followUpDueCount: followUpDue.length,
      followUpDueValue: sumValue(followUpDue),
      hotEngagementCount: hotEngagement.length,
      hotEngagementValue: sumValue(hotEngagement),
      staleNoViewCount: staleNoView.length,
      staleNoViewValue: sumValue(staleNoView),
      recoveredThisMonthCount: recoveredThisMonth.length,
      recoveredThisMonthValue: Math.round(
        recoveredThisMonth.reduce(
          (sum, proposal) => sum + estimateProposalValue(proposal).value,
          0,
        ),
      ),
    },
    queues: {
      followUpDue,
      hotEngagement,
      staleNoView,
      allOpen: openItems,
    },
  };
}

export function toRecoveryQueueItem(
  proposal: RecoveryProposalInput,
): RecoveryQueueItem {
  const estimated = estimateProposalValue(proposal);
  const stage = getRecoveryStage(proposal);
  const priorityScore = getRecoveryPriorityScore(proposal, estimated.value);

  return {
    id: proposal.id,
    title: proposal.title,
    publicUrl: proposal.publicUrl,
    status: proposal.status,
    contactName:
      proposal.contact?.fullName ||
      proposal.contact?.email ||
      proposal.company.name,
    contactEmail: proposal.contact?.email || null,
    opportunityTitle: proposal.opportunity.title,
    estimatedValue: estimated.value,
    estimatedValueSource: estimated.source,
    priorityScore,
    stage,
    stageLabel: getStageLabel(stage),
    primaryReason: getPrimaryReason(proposal, stage),
    sentAt: proposal.sentAt,
    viewedAt: proposal.viewedAt,
    lastEmailSentAt: proposal.lastEmailSentAt,
    daysSinceLastTouch: proposal.daysSinceLastTouch,
    viewCount: proposal.viewCount,
    optionFocusCount: proposal.optionFocusCount,
    needsFollowUp: proposal.needsFollowUp,
    followUpReason: proposal.followUpReason,
    followUpSendCount: proposal.followUpSendCount,
    maxFollowUps: proposal.maxFollowUps,
    mostFocusedOption: proposal.mostFocusedOption,
  };
}

export function estimateProposalValue(proposal: RecoveryProposalInput) {
  if (proposal.selectedOptionSummary) {
    return {
      value: Math.round(proposal.selectedOptionSummary.finalPrice),
      source: `${proposal.selectedOptionSummary.tier} selected option`,
    };
  }

  const focusedOption = proposal.mostFocusedOption?.optionId
    ? proposal.options.find((option) => option.id === proposal.mostFocusedOption?.optionId)
    : null;

  if (focusedOption) {
    return {
      value: Math.round(focusedOption.finalCustomerPrice),
      source: `${focusedOption.tier} focused option`,
    };
  }

  const betterOption = proposal.options.find((option) => option.tier === "BETTER");
  if (betterOption) {
    return {
      value: Math.round(betterOption.finalCustomerPrice),
      source: "BETTER option",
    };
  }

  const lowestOption = [...proposal.options].sort(
    (a, b) => a.finalCustomerPrice - b.finalCustomerPrice,
  )[0];

  if (lowestOption) {
    return {
      value: Math.round(lowestOption.finalCustomerPrice),
      source: `${lowestOption.tier} option`,
    };
  }

  return { value: 0, source: "No priced option" };
}

export function getRecoveryStage(proposal: RecoveryProposalInput): RecoveryStage {
  if (proposal.needsFollowUp) {
    return "FOLLOW_UP_DUE";
  }

  if (
    proposal.status === "VIEWED" ||
    proposal.optionFocusCount > 0 ||
    (proposal.mostFocusedOption?.count || 0) > 0
  ) {
    return "HOT_ENGAGEMENT";
  }

  if (proposal.status === "SENT" && (proposal.daysSinceLastTouch || 0) >= 2) {
    return "STALE_NO_VIEW";
  }

  return "OPEN_MONITORING";
}

export function getRecoveryPriorityScore(
  proposal: RecoveryProposalInput,
  estimatedValue = estimateProposalValue(proposal).value,
) {
  let score = 0;

  if (proposal.needsFollowUp) score += 40;
  if (proposal.status === "VIEWED") score += 25;
  score += Math.min(proposal.viewCount, 5) * 6;
  score += Math.min(proposal.optionFocusCount, 6) * 8;
  score += Math.min(proposal.mostFocusedOption?.count || 0, 5) * 7;
  score += Math.min(proposal.daysSinceLastTouch || 0, 14) * 2;

  if (!proposal.lastEmailSentAt && proposal.status === "SENT") score += 12;
  if (estimatedValue >= 20000) score += 12;
  else if (estimatedValue >= 12000) score += 8;
  else if (estimatedValue >= 6000) score += 4;

  return score;
}

function getStageLabel(stage: RecoveryStage) {
  if (stage === "FOLLOW_UP_DUE") return "Follow-up due";
  if (stage === "HOT_ENGAGEMENT") return "Hot engagement";
  if (stage === "STALE_NO_VIEW") return "Stale no-view";
  return "Monitoring";
}

function getPrimaryReason(
  proposal: RecoveryProposalInput,
  stage: RecoveryStage,
) {
  if (proposal.followUpReason) return proposal.followUpReason;

  if (stage === "HOT_ENGAGEMENT") {
    if (proposal.mostFocusedOption) {
      const label = [
        proposal.mostFocusedOption.tier,
        proposal.mostFocusedOption.title,
      ]
        .filter(Boolean)
        .join(" - ");
      return `${label || "An option"} has ${proposal.mostFocusedOption.count} focus event${
        proposal.mostFocusedOption.count === 1 ? "" : "s"
      }.`;
    }

    return "Homeowner viewed the proposal but has not accepted yet.";
  }

  if (stage === "STALE_NO_VIEW") {
    return "Proposal was sent but no homeowner view has been recorded.";
  }

  return "Open proposal is still inside the normal follow-up window.";
}

function sumValue(items: RecoveryQueueItem[]) {
  return Math.round(items.reduce((sum, item) => sum + item.estimatedValue, 0));
}
