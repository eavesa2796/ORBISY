/**
 * POST /api/outreach/worker/send-due
 * Automation worker that sends scheduled messages
 * Should be called by cron job every 10 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/outreach/security";
import { sendOutreachEmail, getSenderName } from "@/lib/outreach/email";
import { renderTemplate } from "@/lib/outreach/templating";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for processing

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const maxToSend = 100; // Max per run to avoid timeouts

    // Find messages due to be sent
    const dueMessages = await prisma.outreachMessage.findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: { lte: now },
      },
      take: maxToSend,
      include: {
        lead: true,
        campaign: {
          include: {
            steps: {
              orderBy: { stepIndex: "asc" },
            },
          },
        },
        step: true,
      },
      orderBy: { scheduledFor: "asc" },
    });

    console.log(`Found ${dueMessages.length} messages to send`);

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Track sends per campaign for daily limits
    const campaignSendCounts = new Map<string, number>();

    for (const message of dueMessages) {
      try {
        const { lead, campaign, step } = message;

        // Skip if lead is DNC or unsubscribed
        if (lead.doNotContact || lead.unsubscribedAt) {
          await prisma.outreachMessage.update({
            where: { id: message.id },
            data: {
              status: "CANCELED",
              error: "Lead is on do-not-contact list",
            },
          });
          results.skipped++;
          continue;
        }

        // Skip if no email
        if (!lead.email) {
          await prisma.outreachMessage.update({
            where: { id: message.id },
            data: {
              status: "CANCELED",
              error: "Lead has no email address",
            },
          });
          results.skipped++;
          continue;
        }

        // Check if enrollment is still active
        const enrollment = await prisma.outreachEnrollment.findUnique({
          where: {
            leadId_campaignId: {
              leadId: lead.id,
              campaignId: campaign.id,
            },
          },
        });

        if (!enrollment || enrollment.status !== "ACTIVE") {
          await prisma.outreachMessage.update({
            where: { id: message.id },
            data: {
              status: "CANCELED",
              error: "Enrollment is not active",
            },
          });
          results.skipped++;
          continue;
        }

        // Check campaign daily limit
        const campaignSends = campaignSendCounts.get(campaign.id) || 0;
        if (campaignSends >= campaign.dailyLimit) {
          console.log(
            `Campaign ${campaign.name} has reached daily limit of ${campaign.dailyLimit}`
          );
          results.skipped++;
          continue;
        }

        // Send email
        const emailResult = await sendOutreachEmail({
          to: lead.email,
          from: campaign.fromMailbox,
          subject: message.subjectRendered,
          body: message.bodyRendered,
          replyTo: campaign.fromMailbox,
        });

        if (emailResult.success) {
          // Update message status
          await prisma.outreachMessage.update({
            where: { id: message.id },
            data: {
              status: "SENT",
              sentAt: new Date(),
              providerMessageId: emailResult.messageId,
            },
          });

          // Update lead last touch
          await prisma.outreachLead.update({
            where: { id: lead.id },
            data: {
              lastTouchAt: new Date(),
              lastActivity: `Sent: ${step.subjectTemplate}`,
              stage: lead.stage === "NEW" ? "CONTACTED" : lead.stage,
            },
          });

          // Schedule next step if exists
          const currentStepIndex = step.stepIndex;
          const nextStep = campaign.steps.find(
            (s) => s.stepIndex === currentStepIndex + 1
          );

          if (nextStep) {
            const nextScheduledFor = new Date(
              now.getTime() + nextStep.dayOffset * 24 * 60 * 60 * 1000
            );

            const senderName = getSenderName();
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
              nextStep.subjectTemplate,
              variables
            );
            const bodyRendered = renderTemplate(
              nextStep.bodyTemplate,
              variables
            );

            await prisma.outreachMessage.create({
              data: {
                leadId: lead.id,
                campaignId: campaign.id,
                stepId: nextStep.id,
                scheduledFor: nextScheduledFor,
                status: "SCHEDULED",
                subjectRendered,
                bodyRendered,
              },
            });
          } else {
            // Mark enrollment as completed
            await prisma.outreachEnrollment.update({
              where: {
                leadId_campaignId: {
                  leadId: lead.id,
                  campaignId: campaign.id,
                },
              },
              data: {
                status: "COMPLETED",
              },
            });
          }

          campaignSendCounts.set(campaign.id, campaignSends + 1);
          results.sent++;

          console.log(
            `✅ Sent to ${lead.email} (${campaign.name} step ${currentStepIndex})`
          );
        } else {
          // Mark as failed
          await prisma.outreachMessage.update({
            where: { id: message.id },
            data: {
              status: "FAILED",
              error: emailResult.error,
            },
          });

          results.failed++;
          results.errors.push(
            `Failed to send to ${lead.email}: ${emailResult.error}`
          );

          console.error(`❌ Failed to send to ${lead.email}:`, emailResult.error);
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        results.failed++;
        results.errors.push(`Error processing message ${message.id}: ${error}`);
        console.error(`Error processing message ${message.id}:`, err);

        // Mark message as failed
        await prisma.outreachMessage.update({
          where: { id: message.id },
          data: {
            status: "FAILED",
            error,
          },
        });
      }
    }

    console.log("Worker completed:", results);

    return NextResponse.json({
      success: true,
      processed: dueMessages.length,
      ...results,
    });
  } catch (error) {
    console.error("Worker error:", error);
    return NextResponse.json(
      {
        error: "Worker failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
