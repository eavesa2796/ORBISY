/**
 * POST /api/outreach/webhooks/inbound-email
 * Webhook to capture inbound email replies
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/outreach/security";

export const runtime = "nodejs";

interface InboundEmailPayload {
  from: string;
  to?: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  messageId?: string;
  raw?: any;
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const body: InboundEmailPayload = JSON.parse(bodyText);

    // Verify webhook signature
    if (!verifyWebhookSignature(request, bodyText)) {
      console.error("Webhook signature verification failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { from, subject, body: emailBody, inReplyTo, messageId, raw } = body;

    if (!from) {
      return NextResponse.json(
        { error: "Missing from address" },
        { status: 400 }
      );
    }

    console.log(`📧 Received inbound email from ${from}`);

    // Find lead by email
    const lead = await prisma.outreachLead.findUnique({
      where: { email: from.toLowerCase() },
    });

    if (!lead) {
      console.log(`No lead found for ${from}`);
      return NextResponse.json({
        success: true,
        message: "No matching lead found",
      });
    }

    // Find related message by provider message ID or lead
    let relatedMessage = null;
    if (inReplyTo) {
      relatedMessage = await prisma.outreachMessage.findFirst({
        where: {
          providerMessageId: inReplyTo,
          leadId: lead.id,
        },
      });
    }

    if (!relatedMessage) {
      // Try to find most recent sent message to this lead
      relatedMessage = await prisma.outreachMessage.findFirst({
        where: {
          leadId: lead.id,
          status: { in: ["SENT", "DELIVERED"] },
        },
        orderBy: { sentAt: "desc" },
      });
    }

    const campaignId = relatedMessage?.campaignId;

    // Classify sentiment
    const sentiment = classifySentiment(emailBody, subject);

    // Create reply record
    const reply = await prisma.outreachReply.create({
      data: {
        leadId: lead.id,
        campaignId: campaignId || "",
        messageId: relatedMessage?.id,
        receivedAt: new Date(),
        fromEmail: from,
        subject,
        body: emailBody,
        sentiment,
        raw,
      },
    });

    // Update lead status
    await prisma.outreachLead.update({
      where: { id: lead.id },
      data: {
        stage: "REPLIED",
        lastTouchAt: new Date(),
        lastActivity: `Replied: ${subject}`,
      },
    });

    // If negative sentiment (unsubscribe request), add to unsubscribe list
    if (sentiment === "NEGATIVE") {
      const keywords = ["unsubscribe", "remove", "stop", "opt out", "opt-out"];
      const hasUnsubKeyword = keywords.some(
        (kw) =>
          emailBody.toLowerCase().includes(kw) ||
          subject.toLowerCase().includes(kw)
      );

      if (hasUnsubKeyword) {
        await prisma.outreachUnsubscribe.upsert({
          where: { email: from.toLowerCase() },
          create: { email: from.toLowerCase() },
          update: {},
        });

        await prisma.outreachLead.update({
          where: { id: lead.id },
          data: {
            doNotContact: true,
            unsubscribedAt: new Date(),
          },
        });
      }
    }

    // Stop all active enrollments for this lead
    const activeEnrollments = await prisma.outreachEnrollment.findMany({
      where: {
        leadId: lead.id,
        status: "ACTIVE",
      },
    });

    for (const enrollment of activeEnrollments) {
      await prisma.outreachEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "STOPPED",
          stoppedReason: "Lead replied to campaign",
        },
      });

      // Cancel scheduled messages
      await prisma.outreachMessage.updateMany({
        where: {
          leadId: lead.id,
          campaignId: enrollment.campaignId,
          status: "SCHEDULED",
        },
        data: {
          status: "CANCELED",
          error: "Canceled due to reply",
        },
      });
    }

    // Mark related message as replied
    if (relatedMessage) {
      await prisma.outreachMessage.update({
        where: { id: relatedMessage.id },
        data: { status: "REPLIED" },
      });
    }

    console.log(`✅ Processed reply from ${from}, sentiment: ${sentiment}`);

    return NextResponse.json({
      success: true,
      replyId: reply.id,
      sentiment,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Simple sentiment classification based on keywords
 */
function classifySentiment(body: string, subject: string): "POSITIVE" | "NEUTRAL" | "NEGATIVE" {
  const text = (body + " " + subject).toLowerCase();

  const positiveKeywords = [
    "yes",
    "interested",
    "sounds good",
    "let's talk",
    "call me",
    "meeting",
    "demo",
    "pricing",
    "book",
    "schedule",
    "tell me more",
  ];

  const negativeKeywords = [
    "no",
    "not interested",
    "remove",
    "unsubscribe",
    "stop",
    "spam",
    "don't contact",
    "do not contact",
    "opt out",
    "opt-out",
  ];

  const positiveScore = positiveKeywords.filter((kw) => text.includes(kw)).length;
  const negativeScore = negativeKeywords.filter((kw) => text.includes(kw)).length;

  if (negativeScore > 0) return "NEGATIVE";
  if (positiveScore > 0) return "POSITIVE";
  return "NEUTRAL";
}
