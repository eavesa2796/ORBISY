import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type EngagementPayload = {
  eventType?: "OPTION_VIEWED";
  optionId?: string;
  metadata?: {
    source?: string;
  };
};

function cleanSource(value: unknown) {
  if (typeof value !== "string") return "public_option_focus";
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : "public_option_focus";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await params;

  try {
    const body = (await request.json()) as EngagementPayload;

    if (body.eventType !== "OPTION_VIEWED") {
      return NextResponse.json(
        { ok: false, error: "Unsupported engagement event" },
        { status: 400 },
      );
    }

    if (!body.optionId) {
      return NextResponse.json(
        { ok: false, error: "optionId is required" },
        { status: 400 },
      );
    }

    const proposal = await prisma.salesProposal.findUnique({
      where: { publicToken },
      select: {
        id: true,
        status: true,
        options: {
          select: {
            id: true,
            tier: true,
            title: true,
          },
        },
      },
    });

    if (!proposal || proposal.status === "DRAFT") {
      return NextResponse.json(
        { ok: false, error: "Proposal not available" },
        { status: 404 },
      );
    }

    const option = proposal.options.find((item) => item.id === body.optionId);
    if (!option) {
      return NextResponse.json(
        { ok: false, error: "Option does not belong to this proposal" },
        { status: 400 },
      );
    }

    const metadata: Prisma.InputJsonValue = {
      source: cleanSource(body.metadata?.source),
      optionId: option.id,
      tier: option.tier,
      title: option.title,
      statusAtEvent: proposal.status,
      userAgent: request.headers.get("user-agent") || null,
      referrer: request.headers.get("referer") || null,
    };

    const event = await prisma.salesProposalEvent.create({
      data: {
        proposalId: proposal.id,
        eventType: "OPTION_VIEWED",
        metadata,
      },
      select: {
        id: true,
        eventType: true,
        occurredAt: true,
      },
    });

    return NextResponse.json({ ok: true, event });
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
