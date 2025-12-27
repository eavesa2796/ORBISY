/**
 * GET /api/outreach/leads - List leads with filters
 * POST /api/outreach/leads - Create a new lead
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OutreachLeadStage } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const stage = searchParams.get("stage") as OutreachLeadStage | null;
    const industry = searchParams.get("industry") || "";

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { company: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (stage) {
      where.stage = stage;
    }

    if (industry) {
      where.industry = { contains: industry, mode: "insensitive" };
    }

    const [leads, total] = await Promise.all([
      prisma.outreachLead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              enrollments: true,
              messages: true,
              replies: true,
            },
          },
        },
      }),
      prisma.outreachLead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      company,
      contactName,
      role,
      email,
      phone,
      website,
      city,
      industry,
      score,
      tags,
      notes,
      stage,
    } = body;

    if (!company || !contactName) {
      return NextResponse.json(
        { error: "Company and contact name are required" },
        { status: 400 }
      );
    }

    // Check for duplicate email
    if (email) {
      const existing = await prisma.outreachLead.findUnique({
        where: { email },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Lead with this email already exists" },
          { status: 400 }
        );
      }
    }

    const lead = await prisma.outreachLead.create({
      data: {
        company,
        contactName,
        role,
        email,
        phone,
        website,
        city,
        industry,
        score: score || 50,
        tags: tags || [],
        notes,
        stage: stage || "NEW",
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
