/**
 * PATCH /api/outreach/campaigns/[id] - Update campaign
 * DELETE /api/outreach/campaigns/[id] - Delete campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const { steps, ...campaignData } = body;

    const campaign = await prisma.outreachCampaign.update({
      where: { id },
      data: {
        ...campaignData,
        updatedAt: new Date(),
      },
      include: {
        steps: true,
      },
    });

    // Update steps if provided
    if (steps) {
      // Delete existing steps
      await prisma.outreachCampaignStep.deleteMany({
        where: { campaignId: id },
      });

      // Create new steps
      await prisma.outreachCampaignStep.createMany({
        data: steps.map((step: any, index: number) => ({
          campaignId: id,
          stepIndex: index,
          dayOffset: step.dayOffset,
          subjectTemplate: step.subjectTemplate,
          bodyTemplate: step.bodyTemplate,
        })),
      });
    }

    const updated = await prisma.outreachCampaign.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.outreachCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
