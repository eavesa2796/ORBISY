/**
 * POST /api/outreach/webhooks/test-inbound
 * Test endpoint to manually create inbound replies for testing
 * This simulates receiving an inbound email
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface TestInboundPayload {
  email: string; // Lead email address
  subject: string;
  body: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, subject, body }: TestInboundPayload = await request.json();

    if (!email || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: email, subject, body" },
        { status: 400 }
      );
    }

    console.log(`📧 Test inbound email from ${email}`);

    // Find lead by email
    const lead = await prisma.outreachLead.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!lead) {
      return NextResponse.json(
        { error: `No lead found with email: ${email}` },
        { status: 404 }
      );
    }

    // Find most recent message sent to this lead
    const relatedMessage = await prisma.outreachMessage.findFirst({
      where: {
        leadId: lead.id,
        status: { in: ["SENT", "DELIVERED"] },
      },
      orderBy: { sentAt: "desc" },
    });

    const campaignId = relatedMessage?.campaignId || "";

    // Classify sentiment
    const sentiment = classifySentiment(body, subject);

    // Create reply record
    const reply = await prisma.outreachReply.create({
      data: {
        leadId: lead.id,
        campaignId: campaignId,
        messageId: relatedMessage?.id,
        receivedAt: new Date(),
        fromEmail: email,
        subject,
        body,
        sentiment,
        raw: { test: true },
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

    // Check for unsubscribe keywords
    const keywords = ["unsubscribe", "remove", "stop", "opt out", "opt-out"];
    const hasUnsubKeyword = keywords.some(
      (kw) =>
        body.toLowerCase().includes(kw) || subject.toLowerCase().includes(kw)
    );

    if (hasUnsubKeyword || sentiment === "NEGATIVE") {
      await prisma.outreachUnsubscribe.upsert({
        where: { email: email.toLowerCase() },
        create: { email: email.toLowerCase() },
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

    console.log(`✅ Test reply created from ${email}, sentiment: ${sentiment}`);

    return NextResponse.json({
      success: true,
      replyId: reply.id,
      sentiment,
      leadStatus: "REPLIED",
      enrollmentsStopped: activeEnrollments.length,
    });
  } catch (error) {
    console.error("Test inbound error:", error);
    return NextResponse.json(
      {
        error: "Failed to process test inbound email",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Simple sentiment classification
 */
function classifySentiment(
  body: string,
  subject: string
): "POSITIVE" | "NEUTRAL" | "NEGATIVE" {
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

  const positiveScore = positiveKeywords.filter((kw) =>
    text.includes(kw)
  ).length;
  const negativeScore = negativeKeywords.filter((kw) =>
    text.includes(kw)
  ).length;

  if (negativeScore > 0) return "NEGATIVE";
  if (positiveScore > 0) return "POSITIVE";
  return "NEUTRAL";
}
