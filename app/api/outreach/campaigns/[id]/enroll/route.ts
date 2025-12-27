/**
 * POST /api/outreach/campaigns/[id]/enroll - Enroll leads in campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderTemplate } from "@/lib/outreach/templating";
import { getSenderName } from "@/lib/outreach/email";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const { leadIds } = body;

    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
      include: {
        steps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.steps.length === 0) {
      return NextResponse.json(
        { error: "Campaign has no steps" },
        { status: 400 }
      );
    }

    let leadsToEnroll;

    if (leadIds && leadIds.length > 0) {
      // Enroll specific leads
      leadsToEnroll = await prisma.outreachLead.findMany({
        where: {
          id: { in: leadIds },
          doNotContact: false,
          unsubscribedAt: null,
          email: { not: null },
        },
      });
    } else {
      // Enroll based on audience rules
      const where: any = {
        doNotContact: false,
        unsubscribedAt: null,
        email: { not: null },
      };

      if (campaign.audienceIndustry) {
        where.industry = {
          contains: campaign.audienceIndustry,
          mode: "insensitive",
        };
      }

      if (campaign.audienceGeoContains) {
        where.city = {
          contains: campaign.audienceGeoContains,
          mode: "insensitive",
        };
      }

      if (campaign.audienceMinScore) {
        where.score = { gte: campaign.audienceMinScore };
      }

      leadsToEnroll = await prisma.outreachLead.findMany({ where });
    }

    const results = {
      enrolled: 0,
      skipped: 0,
      errors: [] as string[],
    };

    const senderName = getSenderName();

    for (const lead of leadsToEnroll) {
      try {
        // Check if already enrolled
        const existing = await prisma.outreachEnrollment.findUnique({
          where: {
            leadId_campaignId: {
              leadId: lead.id,
              campaignId: campaign.id,
            },
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create enrollment
        await prisma.outreachEnrollment.create({
          data: {
            leadId: lead.id,
            campaignId: campaign.id,
            status: "ACTIVE",
          },
        });

        // Schedule first step
        const firstStep = campaign.steps[0];
        const now = new Date();
        const scheduledFor = new Date(
          now.getTime() + firstStep.dayOffset * 24 * 60 * 60 * 1000
        );

        const variables = {
          company: lead.company,
          contact: lead.contactName,
          contactName: lead.contactName,
          city: lead.city || "",
          sender: senderName,
          senderName,
          industry: lead.industry || "",
          website: lead.website || "",
          role: lead.role || "",
          phone: lead.phone || "",
        };

        const subjectRendered = renderTemplate(
          firstStep.subjectTemplate,
          variables
        );
        const bodyRendered = renderTemplate(firstStep.bodyTemplate, variables);

        await prisma.outreachMessage.create({
          data: {
            leadId: lead.id,
            campaignId: campaign.id,
            stepId: firstStep.id,
            scheduledFor,
            status: "SCHEDULED",
            subjectRendered,
            bodyRendered,
          },
        });

        results.enrolled++;
      } catch (err) {
        results.errors.push(
          `Failed to enroll ${lead.company}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      enrolled: results.enrolled,
      skipped: results.skipped,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Error enrolling leads:", error);
    return NextResponse.json(
      { error: "Failed to enroll leads" },
      { status: 500 }
    );
  }
}
