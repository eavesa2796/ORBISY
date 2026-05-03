import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendAcceptedProposalNotification } from "@/lib/sales/proposals/accepted-notification";
import { assertProposalStatusTransition } from "@/lib/sales/proposals/status";

export const runtime = "nodejs";

type AcceptProposalPayload = {
  optionId?: string;
};

type AcceptedProposal = Prisma.SalesProposalGetPayload<{
  include: { options: true };
}>;

function serializeAcceptedProposal(proposal: AcceptedProposal) {
  return {
    id: proposal.id,
    publicToken: proposal.publicToken,
    status: proposal.status,
    selectedOptionId: proposal.selectedOptionId,
    acceptedAt: proposal.acceptedAt,
    opportunityId: proposal.opportunityId,
    options: proposal.options.map((option) => ({
      id: option.id,
      tier: option.tier,
      title: option.title,
      finalCustomerPrice: Number(option.finalCustomerPrice),
    })),
  };
}

function notificationOrigin(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin)
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await params;

  try {
    const body = (await request.json()) as AcceptProposalPayload;
    if (!body.optionId) {
      return NextResponse.json(
        { ok: false, error: "optionId is required" },
        { status: 400 },
      );
    }

    const accepted = await prisma.$transaction(async (tx) => {
      const proposal = await tx.salesProposal.findUnique({
        where: { publicToken },
        include: {
          options: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!proposal) {
        return { type: "not_found" as const };
      }

      if (proposal.status === "DRAFT") {
        return { type: "not_available" as const };
      }

      const selectedOption = proposal.options.find(
        (option) => option.id === body.optionId,
      );
      if (!selectedOption) {
        return { type: "bad_option" as const };
      }

      if (proposal.status === "DECLINED") {
        return { type: "declined" as const };
      }

      if (proposal.status === "ACCEPTED") {
        if (
          proposal.selectedOptionId &&
          proposal.selectedOptionId !== body.optionId
        ) {
          return { type: "already_accepted_other_option" as const };
        }

        const latest = await tx.salesProposal.findUnique({
          where: { id: proposal.id },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        });
        return { type: "ok" as const, proposal: latest!, notify: false };
      }

      const now = new Date();
      let currentStatus = proposal.status;
      const updateData: {
        status?: "SENT" | "VIEWED" | "ACCEPTED";
        sentAt?: Date;
        viewedAt?: Date;
        acceptedAt?: Date;
        selectedOptionId?: string;
      } = {
        selectedOptionId: body.optionId,
      };

      const events: Array<{
        eventType: "SENT" | "VIEWED" | "ACCEPTED";
        metadata: Prisma.InputJsonValue;
      }> = [];

      if (currentStatus === "SENT" && !proposal.viewedAt) {
        assertProposalStatusTransition("SENT", "VIEWED");
        currentStatus = "VIEWED";
        updateData.status = "VIEWED";
        updateData.viewedAt = now;
        events.push({
          eventType: "VIEWED",
          metadata: { source: "public_accept", firstView: true },
        });
      }

      assertProposalStatusTransition(currentStatus, "ACCEPTED");
      updateData.status = "ACCEPTED";
      updateData.acceptedAt = now;
      events.push({
        eventType: "ACCEPTED",
        metadata: { source: "public_accept", optionId: body.optionId },
      });

      await tx.salesProposal.update({
        where: { id: proposal.id },
        data: updateData,
      });

      await tx.salesProposalEvent.createMany({
        data: events.map((event) => ({
          proposalId: proposal.id,
          eventType: event.eventType,
          metadata: event.metadata,
        })),
      });

      await tx.salesOpportunity.update({
        where: { id: proposal.opportunityId },
        data: { stage: "WON" },
      });

      const latest = await tx.salesProposal.findUnique({
        where: { id: proposal.id },
        include: {
          options: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      return { type: "ok" as const, proposal: latest!, notify: true };
    });

    if (accepted.type === "not_found") {
      return NextResponse.json(
        { ok: false, error: "Proposal not found" },
        { status: 404 },
      );
    }

    if (accepted.type === "not_available") {
      return NextResponse.json(
        { ok: false, error: "Proposal not available" },
        { status: 404 },
      );
    }

    if (accepted.type === "bad_option") {
      return NextResponse.json(
        {
          ok: false,
          error: "Selected option does not belong to this proposal",
        },
        { status: 400 },
      );
    }

    if (accepted.type === "declined") {
      return NextResponse.json(
        { ok: false, error: "Declined proposal cannot be accepted" },
        { status: 409 },
      );
    }

    if (accepted.type === "already_accepted_other_option") {
      return NextResponse.json(
        {
          ok: false,
          error: "Proposal already accepted with a different option",
        },
        { status: 409 },
      );
    }

    const notification = accepted.notify
      ? await sendAcceptedProposalNotification({
          proposalId: accepted.proposal.id,
          origin: notificationOrigin(request),
        }).catch((error) => ({
          status: "failed" as const,
          error: error instanceof Error ? error.message : String(error),
          recipients: [],
        }))
      : { status: "skipped" as const, reason: "Proposal was already accepted" };

    return NextResponse.json({
      ok: true,
      proposal: serializeAcceptedProposal(accepted.proposal),
      notification,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
