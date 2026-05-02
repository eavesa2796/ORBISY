import { describe, expect, it } from "vitest";
import {
  buildRevenueRecoveryDashboard,
  estimateProposalValue,
  getRecoveryStage,
  type RecoveryProposalInput,
} from "./revenue-recovery";

const NOW = new Date("2026-05-02T12:00:00.000Z");

function makeProposal(
  overrides: Partial<RecoveryProposalInput> = {},
): RecoveryProposalInput {
  return {
    id: "proposal_1",
    opportunityId: "opp_1",
    publicToken: "token",
    publicUrl: "https://app.orbisy.com/proposal/token",
    title: "Replacement Proposal",
    status: "SENT",
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    sentAt: new Date("2026-04-27T12:00:00.000Z"),
    viewedAt: null,
    acceptedAt: null,
    declinedAt: null,
    opportunity: { id: "opp_1", title: "Heat pump replacement" },
    company: { id: "company_1", name: "Acme HVAC", slug: "acme" },
    contact: { id: "contact_1", fullName: "Sam Homeowner", email: "sam@example.com" },
    selectedOption: null,
    selectedOptionSummary: null,
    lastEmailSentAt: new Date("2026-04-27T12:00:00.000Z"),
    lastEmailEventType: "EMAIL_SENT",
    emailSendCount: 1,
    followUpSendCount: 0,
    maxFollowUps: 2,
    needsFollowUp: false,
    followUpReason: null,
    daysSinceLastTouch: 1,
    viewCount: 0,
    lastViewedEventAt: null,
    optionFocusCount: 0,
    mostFocusedOption: null,
    options: [
      {
        id: "good",
        tier: "GOOD",
        title: "Good",
        finalCustomerPrice: 9000,
        grossMarginPercent: 35,
      },
      {
        id: "better",
        tier: "BETTER",
        title: "Better",
        finalCustomerPrice: 12000,
        grossMarginPercent: 38,
      },
      {
        id: "best",
        tier: "BEST",
        title: "Best",
        finalCustomerPrice: 16000,
        grossMarginPercent: 42,
      },
    ],
    ...overrides,
  };
}

describe("revenue recovery helpers", () => {
  it("uses focused option value before defaulting to BETTER", () => {
    const proposal = makeProposal({
      optionFocusCount: 2,
      mostFocusedOption: {
        optionId: "best",
        tier: "BEST",
        title: "Best",
        count: 2,
        lastFocusedAt: NOW,
      },
    });

    expect(estimateProposalValue(proposal)).toEqual({
      value: 16000,
      source: "BEST focused option",
    });
  });

  it("classifies due follow-ups before engagement queues", () => {
    const proposal = makeProposal({
      status: "VIEWED",
      needsFollowUp: true,
      followUpReason: "Last proposal email is older than follow-up threshold.",
      viewCount: 3,
      optionFocusCount: 2,
      daysSinceLastTouch: 5,
    });

    expect(getRecoveryStage(proposal)).toBe("FOLLOW_UP_DUE");
  });

  it("summarizes recovery queues and value at risk", () => {
    const due = makeProposal({
      id: "due",
      needsFollowUp: true,
      daysSinceLastTouch: 4,
    });
    const hot = makeProposal({
      id: "hot",
      status: "VIEWED",
      viewedAt: NOW,
      viewCount: 2,
      optionFocusCount: 1,
    });
    const accepted = makeProposal({
      id: "accepted",
      status: "ACCEPTED",
      acceptedAt: NOW,
      selectedOptionSummary: {
        id: "better",
        tier: "BETTER",
        title: "Better",
        equipment: "Carrier Heat Pump",
        finalPrice: 12000,
        warranty: null,
        financingEstimate: null,
        financingApr: null,
        financingMonths: null,
      },
    });

    const dashboard = buildRevenueRecoveryDashboard([due, hot, accepted], { now: NOW });

    expect(dashboard.metrics.openProposalCount).toBe(2);
    expect(dashboard.metrics.totalOpenValue).toBe(24000);
    expect(dashboard.metrics.followUpDueCount).toBe(1);
    expect(dashboard.metrics.hotEngagementCount).toBe(1);
    expect(dashboard.metrics.recoveredThisMonthValue).toBe(12000);
  });
});
