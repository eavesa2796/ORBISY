import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/outreach/security";
import {
  buildInternalPublicProposalUrl,
  getProposalFollowUpDays,
  getProposalFollowUpState,
  getProposalMaxFollowUps,
} from "@/lib/sales/proposals/internal-list";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

function getWorkerLimit() {
  const raw = Number.parseInt(process.env.PROPOSAL_FOLLOW_UP_BATCH_LIMIT || "", 10);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.min(raw, 100);
  }

  return 20;
}

function buildFollowUpEmail(input: {
  customerName: string;
  companyName: string;
  opportunityTitle: string;
  publicUrl: string;
}) {
  const subject = `Any questions about your HVAC proposal?`;
  const text = [
    `Hi ${input.customerName},`,
    "",
    `I wanted to follow up on the HVAC proposal for ${input.opportunityTitle}.`,
    "",
    `You can review the Good / Better / Best options here: ${input.publicUrl}`,
    "",
    "If you want to move forward, choose the option that fits best from the proposal page.",
    "If you have questions about equipment, financing, warranty, or timing, reply to this email and our team will help.",
    "",
    `- ${input.companyName}`,
  ].join("\n");

  return { subject, text };
}

async function handleSendDue(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const fromEmail = process.env.CONTACT_FROM || process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    return NextResponse.json(
      { ok: false, error: "CONTACT_FROM or RESEND_FROM_EMAIL is required" },
      { status: 503 },
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const now = new Date();
  const followUpDays = getProposalFollowUpDays();
  const maxFollowUps = getProposalMaxFollowUps();
  const limit = getWorkerLimit();
  const baseUrl =
    process.env.NEXT_PUBLIC_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin);

  try {
    const candidates = await prisma.salesProposal.findMany({
      where: {
        status: { in: ["SENT", "VIEWED"] },
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        opportunity: { select: { id: true, title: true } },
        contact: { select: { id: true, fullName: true, email: true } },
        events: {
          where: {
            eventType: { in: ["EMAIL_SENT", "FOLLOW_UP_SENT"] },
          },
          select: {
            eventType: true,
            occurredAt: true,
          },
          orderBy: { occurredAt: "desc" },
        },
      },
      orderBy: [{ updatedAt: "asc" }],
      take: limit * 3,
    });

    const summary = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [] as Array<{ proposalId: string; error: string }>,
    };

    for (const proposal of candidates) {
      if (summary.processed >= limit) break;

      const followUpState = getProposalFollowUpState(proposal, {
        now,
        followUpDays,
        maxFollowUps,
      });

      if (!followUpState.needsFollowUp) {
        summary.skipped += 1;
        continue;
      }

      summary.processed += 1;

      const contactEmail = proposal.contact?.email?.trim().toLowerCase();
      if (!contactEmail) {
        summary.skipped += 1;
        continue;
      }

      const suppressed = await prisma.outreachUnsubscribe.findUnique({
        where: { email: contactEmail },
      });

      if (suppressed) {
        summary.skipped += 1;
        continue;
      }

      const publicUrl = buildInternalPublicProposalUrl(baseUrl, proposal.publicToken);
      const customerName =
        proposal.contact?.fullName?.trim() || proposal.company.name || "there";
      const email = buildFollowUpEmail({
        customerName,
        companyName: proposal.company.name,
        opportunityTitle: proposal.opportunity.title,
        publicUrl,
      });

      const emailResult = await resend.emails.send({
        from: fromEmail,
        to: contactEmail,
        replyTo: fromEmail,
        subject: email.subject,
        text: email.text,
      });

      if (emailResult.error) {
        summary.errors.push({
          proposalId: proposal.id,
          error: emailResult.error.message || "Unknown Resend error",
        });
        continue;
      }

      const sentAt = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.salesProposalEvent.create({
          data: {
            proposalId: proposal.id,
            eventType: "FOLLOW_UP_SENT",
            occurredAt: sentAt,
            metadata: {
              source: "automated_follow_up_worker",
              messageId: emailResult.data?.id || null,
              to: contactEmail,
              from: fromEmail,
              subject: email.subject,
              publicUrl,
              customerName,
              companyName: proposal.company.name,
              opportunityTitle: proposal.opportunity.title,
              followUpDays,
              maxFollowUps,
              daysSinceLastTouch: followUpState.daysSinceLastTouch,
              followUpReason: followUpState.followUpReason,
            },
          },
        });

        await tx.salesProposal.update({
          where: { id: proposal.id },
          data: { followUpSentAt: sentAt },
        });
      });

      summary.sent += 1;
    }

    return NextResponse.json({
      ok: true,
      followUpDays,
      maxFollowUps,
      limit,
      candidates: candidates.length,
      ...summary,
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

export async function GET(request: NextRequest) {
  return handleSendDue(request);
}

export async function POST(request: NextRequest) {
  return handleSendDue(request);
}
