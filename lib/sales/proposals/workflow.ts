import { type Prisma } from "@prisma/client";
import { assertProposalStatusTransition, type ProposalStatus } from "./status";

type ProposalWorkflowState = {
  publicToken: string;
  status: ProposalStatus;
  sentAt?: Date | null;
  viewedAt?: Date | null;
};

export function buildPublicProposalUrl(origin: string, publicToken: string) {
  return `${origin.replace(/\/$/, "")}/proposal/${publicToken}`;
}

export function prepareMarkProposalSent(
  proposal: ProposalWorkflowState,
  origin: string,
  now = new Date(),
): {
  update: { status: "SENT"; sentAt: Date };
  event: { eventType: "SENT"; metadata: Prisma.InputJsonValue };
  publicUrl: string;
} {
  assertProposalStatusTransition(proposal.status, "SENT");

  return {
    update: {
      status: "SENT",
      sentAt: proposal.sentAt ?? now,
    },
    event: {
      eventType: "SENT",
      metadata: { source: "internal_mark_sent", publicToken: proposal.publicToken },
    },
    publicUrl: buildPublicProposalUrl(origin, proposal.publicToken),
  };
}

export function preparePublicProposalView(
  proposal: ProposalWorkflowState,
  now = new Date(),
):
  | { available: false }
    | {
        available: true;
        update?: { status: "VIEWED"; viewedAt: Date };
        event: { eventType: "VIEWED"; metadata: Prisma.InputJsonValue };
      } {
  if (proposal.status === "DRAFT") {
    return { available: false };
  }

  if (proposal.status === "SENT" && !proposal.viewedAt) {
    assertProposalStatusTransition("SENT", "VIEWED");
    return {
      available: true,
      update: {
        status: "VIEWED",
        viewedAt: now,
      },
      event: {
        eventType: "VIEWED",
        metadata: {
          source: "public_page_open",
          firstView: true,
          statusAtOpen: proposal.status,
        },
      },
    };
  }

  return {
    available: true,
    event: {
      eventType: "VIEWED",
      metadata: {
        source: "public_page_open",
        firstView: false,
        statusAtOpen: proposal.status,
      },
    },
  };
}
