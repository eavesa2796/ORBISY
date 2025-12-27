/**
 * GET /api/outreach/inbox - Get replies inbox
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const sentiment = searchParams.get("sentiment");

    const skip = (page - 1) * limit;

    const where: any = {};
    if (sentiment) {
      where.sentiment = sentiment;
    }

    const [replies, total] = await Promise.all([
      prisma.outreachReply.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: "desc" },
        include: {
          lead: true,
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.outreachReply.count({ where }),
    ]);

    return NextResponse.json({
      replies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching inbox:", error);
    return NextResponse.json(
      { error: "Failed to fetch inbox" },
      { status: 500 }
    );
  }
}
