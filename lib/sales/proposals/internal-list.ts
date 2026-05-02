export type InternalProposalRecord = {
  id: string;
  publicToken: string;
  title: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED";
  createdAt: Date;
  sentAt: Date | null;
  viewedAt: Date | null;
  followUpSentAt?: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  opportunityId: string;
  opportunity: { id: string; title: string };
  company: { id: string; name: string; slug: string };
  contact: { id: string; fullName: string | null; email: string | null } | null;
  selectedOption: { id: string; tier: "GOOD" | "BETTER" | "BEST"; title: string } | null;
  options: Array<{
    id: string;
    tier: "GOOD" | "BETTER" | "BEST";
    title: string;
    summary?: string | null;
    equipmentSnapshot?: unknown;
    warrantyLabel?: string | null;
    financingApr?: number | null;
    financingMonths?: number | null;
    monthlyPaymentEstimate?: { toString(): string } | number | null;
    finalCustomerPrice: { toString(): string } | number;
    grossMarginPercent?: number;
  }>;
  events?: Array<{
    eventType: string;
    occurredAt: Date;
    metadata?: unknown;
  }>;
};

export const DEFAULT_PROPOSAL_FOLLOW_UP_DAYS = 2;
export const DEFAULT_PROPOSAL_MAX_FOLLOW_UPS = 2;

export function getProposalFollowUpDays() {
  const raw = Number.parseInt(process.env.PROPOSAL_FOLLOW_UP_DAYS || "", 10);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }

  return DEFAULT_PROPOSAL_FOLLOW_UP_DAYS;
}

export function getProposalMaxFollowUps() {
  const raw = Number.parseInt(process.env.PROPOSAL_MAX_FOLLOW_UPS || "", 10);
  if (Number.isFinite(raw) && raw >= 0) {
    return raw;
  }

  return DEFAULT_PROPOSAL_MAX_FOLLOW_UPS;
}

export function getDaysSince(value: Date, now: Date) {
  const elapsedMs = now.getTime() - value.getTime();
  if (elapsedMs < 0) return 0;
  return Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
}

export function getProposalFollowUpState(
  proposal: Pick<InternalProposalRecord, "status" | "sentAt" | "events">,
  options?: {
    now?: Date;
    followUpDays?: number;
    maxFollowUps?: number;
  },
) {
  const now = options?.now || new Date();
  const followUpDays = options?.followUpDays ?? getProposalFollowUpDays();
  const maxFollowUps = options?.maxFollowUps ?? getProposalMaxFollowUps();

  if (proposal.status !== "SENT" && proposal.status !== "VIEWED") {
    return {
      needsFollowUp: false,
      followUpReason: null as string | null,
      daysSinceLastTouch: null as number | null,
    };
  }

  const emailEvents = (proposal.events || [])
    .filter((event) => event.eventType === "EMAIL_SENT" || event.eventType === "FOLLOW_UP_SENT")
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  const followUpEvents = emailEvents.filter((event) => event.eventType === "FOLLOW_UP_SENT");
  const lastEmailEvent = emailEvents[0] || null;
  const lastTouch = lastEmailEvent?.occurredAt || proposal.sentAt;

  if (!lastTouch) {
    return {
      needsFollowUp: false,
      followUpReason: null as string | null,
      daysSinceLastTouch: null as number | null,
    };
  }

  const daysSinceLastTouch = getDaysSince(lastTouch, now);

  if (followUpEvents.length >= maxFollowUps) {
    return {
      needsFollowUp: false,
      followUpReason: null as string | null,
      daysSinceLastTouch,
    };
  }

  if (daysSinceLastTouch < followUpDays) {
    return {
      needsFollowUp: false,
      followUpReason: null as string | null,
      daysSinceLastTouch,
    };
  }

  if (!lastEmailEvent) {
    return {
      needsFollowUp: true,
      followUpReason: "Proposal sent but no email has been sent yet.",
      daysSinceLastTouch,
    };
  }

  return {
    needsFollowUp: true,
    followUpReason: "Last proposal email is older than follow-up threshold.",
    daysSinceLastTouch,
  };
}

export function buildInternalPublicProposalUrl(origin: string, publicToken: string) {
  return `${origin.replace(/\/$/, "")}/proposal/${publicToken}`;
}

function asMetadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
}

function getMetadataString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isTier(value: string | null): value is "GOOD" | "BETTER" | "BEST" {
  return value === "GOOD" || value === "BETTER" || value === "BEST";
}

function summarizeProposalEngagement(
  proposal: Pick<InternalProposalRecord, "viewedAt" | "events" | "options">,
) {
  const events = proposal.events || [];
  const viewEvents = events
    .filter((event) => event.eventType === "VIEWED")
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const optionEvents = events.filter((event) => event.eventType === "OPTION_VIEWED");

  const optionById = new Map(proposal.options.map((option) => [option.id, option]));
  const focusByOption = new Map<
    string,
    {
      optionId: string | null;
      tier: "GOOD" | "BETTER" | "BEST" | null;
      title: string | null;
      count: number;
      lastFocusedAt: Date;
    }
  >();

  for (const event of optionEvents) {
    const metadata = asMetadataRecord(event.metadata);
    const optionId = getMetadataString(metadata, "optionId");
    const fallbackOption = optionId ? optionById.get(optionId) : null;
    const tier = getMetadataString(metadata, "tier");
    const title = getMetadataString(metadata, "title") || fallbackOption?.title || null;
    const key = optionId || `${tier || "UNKNOWN"}:${title || "Unknown option"}`;
    const existing = focusByOption.get(key);

    if (existing) {
      existing.count += 1;
      if (event.occurredAt > existing.lastFocusedAt) {
        existing.lastFocusedAt = event.occurredAt;
      }
      continue;
    }

    focusByOption.set(key, {
      optionId,
      tier: isTier(tier) ? tier : fallbackOption?.tier || null,
      title,
      count: 1,
      lastFocusedAt: event.occurredAt,
    });
  }

  const mostFocusedOption =
    Array.from(focusByOption.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastFocusedAt.getTime() - a.lastFocusedAt.getTime();
    })[0] || null;

  return {
    viewCount: viewEvents.length || (proposal.viewedAt ? 1 : 0),
    lastViewedEventAt: viewEvents[0]?.occurredAt || proposal.viewedAt || null,
    optionFocusCount: optionEvents.length,
    mostFocusedOption,
  };
}

function getEquipmentSummary(equipmentSnapshot: unknown) {
  if (!equipmentSnapshot || typeof equipmentSnapshot !== "object") {
    return null;
  }

  const snapshot = equipmentSnapshot as Record<string, unknown>;
  const brand = typeof snapshot.brand === "string" ? snapshot.brand.trim() : "";
  const modelNumber =
    typeof snapshot.modelNumber === "string" ? snapshot.modelNumber.trim() : "";
  const equipmentType =
    typeof snapshot.equipmentType === "string" ? snapshot.equipmentType.trim() : "";

  const label = [brand, modelNumber, equipmentType].filter(Boolean).join(" ");
  return label || null;
}

export function serializeInternalProposal(
  proposal: InternalProposalRecord,
  origin: string,
  options?: {
    now?: Date;
    followUpDays?: number;
    maxFollowUps?: number;
  },
) {
  const emailEvents = (proposal.events || [])
    .filter((event) => event.eventType === "EMAIL_SENT" || event.eventType === "FOLLOW_UP_SENT")
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const lastEmailEvent = emailEvents[0] || null;
  const followUpState = getProposalFollowUpState(proposal, options);
  const engagement = summarizeProposalEngagement(proposal);
  const selectedOptionDetails = proposal.selectedOption
    ? proposal.options.find((option) => option.id === proposal.selectedOption?.id) || null
    : null;

  return {
    id: proposal.id,
    opportunityId: proposal.opportunityId,
    publicToken: proposal.publicToken,
    publicUrl: buildInternalPublicProposalUrl(origin, proposal.publicToken),
    title: proposal.title,
    status: proposal.status,
    createdAt: proposal.createdAt,
    sentAt: proposal.sentAt,
    viewedAt: proposal.viewedAt,
    acceptedAt: proposal.acceptedAt,
    declinedAt: proposal.declinedAt,
    opportunity: proposal.opportunity,
    company: proposal.company,
    contact: proposal.contact,
    selectedOption: proposal.selectedOption,
    selectedOptionSummary:
      proposal.selectedOption && selectedOptionDetails
        ? {
            id: selectedOptionDetails.id,
            tier: selectedOptionDetails.tier,
            title: selectedOptionDetails.title,
            equipment: getEquipmentSummary(selectedOptionDetails.equipmentSnapshot),
            finalPrice: Number(selectedOptionDetails.finalCustomerPrice),
            warranty: selectedOptionDetails.warrantyLabel || null,
            financingEstimate: selectedOptionDetails.monthlyPaymentEstimate
              ? Number(selectedOptionDetails.monthlyPaymentEstimate)
              : null,
            financingApr: selectedOptionDetails.financingApr ?? null,
            financingMonths: selectedOptionDetails.financingMonths ?? null,
          }
        : null,
    lastEmailSentAt: lastEmailEvent?.occurredAt || null,
    lastEmailEventType: lastEmailEvent?.eventType || null,
    emailSendCount: emailEvents.length,
    followUpSendCount: emailEvents.filter((event) => event.eventType === "FOLLOW_UP_SENT").length,
    maxFollowUps: options?.maxFollowUps ?? getProposalMaxFollowUps(),
    needsFollowUp: followUpState.needsFollowUp,
    followUpReason: followUpState.followUpReason,
    daysSinceLastTouch: followUpState.daysSinceLastTouch,
    viewCount: engagement.viewCount,
    lastViewedEventAt: engagement.lastViewedEventAt,
    optionFocusCount: engagement.optionFocusCount,
    mostFocusedOption: engagement.mostFocusedOption,
    options: proposal.options.map((option) => ({
      id: option.id,
      tier: option.tier,
      title: option.title,
      finalCustomerPrice: Number(option.finalCustomerPrice),
      grossMarginPercent: option.grossMarginPercent,
    })),
  };
}
