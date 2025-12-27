/**
 * GET /api/outreach/campaigns - List campaigns
 * POST /api/outreach/campaigns - Create campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const campaigns = await prisma.outreachCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        steps: {
          orderBy: { stepIndex: "asc" },
        },
        _count: {
          select: {
            enrollments: true,
            messages: true,
            replies: true,
          },
        },
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      channel,
      fromMailbox,
      dailyLimit,
      audienceIndustry,
      audienceGeoContains,
      audienceMinScore,
      steps,
    } = body;

    if (!name || !fromMailbox) {
      return NextResponse.json(
        { error: "Name and fromMailbox are required" },
        { status: 400 }
      );
    }

    const campaign = await prisma.outreachCampaign.create({
      data: {
        name,
        channel: channel || "EMAIL",
        fromMailbox,
        dailyLimit: dailyLimit || 30,
        audienceIndustry,
        audienceGeoContains,
        audienceMinScore,
        status: "PAUSED",
        steps: {
          create: steps || [],
        },
      },
      include: {
        steps: true,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
