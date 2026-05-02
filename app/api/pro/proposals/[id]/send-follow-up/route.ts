import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { authErrorToHttp, requireHvacUser } from "@/lib/session";
import { buildInternalPublicProposalUrl } from "@/lib/sales/proposals/internal-list";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

type ProposalEventType = "EMAIL_SENT" | "FOLLOW_UP_SENT";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session: Awaited<ReturnType<typeof requireHvacUser>>;
  try {
    session = await requireHvacUser();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!session.customerCompanyId) {
    return NextResponse.json(
      { ok: false, error: "HVAC user is not linked to a company workspace" },
      { status: 403 },
    );
  }

  const { id } = await params;

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

  try {
    const proposal = await prisma.salesProposal.findFirst({
      where: {
        id,
        companyId: session.customerCompanyId,
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        opportunity: { select: { id: true, title: true } },
        contact: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { ok: false, error: "Proposal not found" },
        { status: 404 },
      );
    }

    if (proposal.status !== "SENT" && proposal.status !== "VIEWED") {
      return NextResponse.json(
        {
          ok: false,
          error: "Only SENT or VIEWED proposals can receive follow-up",
        },
        { status: 409 },
      );
    }

    if (!proposal.publicToken) {
      return NextResponse.json(
        { ok: false, error: "Proposal missing public token" },
        { status: 422 },
      );
    }

    const contactEmail = proposal.contact?.email?.trim().toLowerCase();
    if (!contactEmail) {
      return NextResponse.json(
        { ok: false, error: "Cannot send follow-up: contact email is missing" },
        { status: 422 },
      );
    }

    const suppressed = await prisma.outreachUnsubscribe.findUnique({
      where: { email: contactEmail },
    });

    if (suppressed) {
      return NextResponse.json(
        { ok: false, error: "Contact is suppressed/unsubscribed" },
        { status: 422 },
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : new URL(request.url).origin);
    const publicUrl = buildInternalPublicProposalUrl(
      baseUrl,
      proposal.publicToken,
    );

    const customerName =
      proposal.contact?.fullName?.trim() || proposal.company.name || "there";

    const subject = `Quick follow-up: ${proposal.company.name} HVAC proposal`;
    const text = [
      `Hi ${customerName},`,
      "",
      `Just checking in on your HVAC proposal for ${proposal.opportunity.title}.`,
      "",
      `Review your proposal here: ${publicUrl}`,
      "",
      "If you are ready to move forward, choose your preferred option directly from the proposal link.",
      "If you have questions, reply to this email and we will help right away.",
      "",
      `- ${proposal.company.name}`,
    ].join("\n");

    const previousEmailEvent = await prisma.salesProposalEvent.findFirst({
      where: {
        proposalId: proposal.id,
        eventType: { in: ["EMAIL_SENT", "FOLLOW_UP_SENT"] },
      },
      orderBy: { occurredAt: "desc" },
    });

    const eventType: ProposalEventType = previousEmailEvent
      ? "FOLLOW_UP_SENT"
      : "EMAIL_SENT";

    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: contactEmail,
      replyTo: fromEmail,
      subject,
      text,
    });

    if (emailResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error: `Resend error: ${emailResult.error.message || "Unknown error"}`,
        },
        { status: 502 },
      );
    }

    const sentAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.salesProposalEvent.create({
        data: {
          proposalId: proposal.id,
          eventType,
          occurredAt: sentAt,
          metadata: {
            source: "pro_dashboard_follow_up",
            sentByUserId: session.userId,
            messageId: emailResult.data?.id || null,
            to: contactEmail,
            from: fromEmail,
            subject,
            publicUrl,
          },
        },
      });

      if (eventType === "FOLLOW_UP_SENT") {
        await tx.salesProposal.update({
          where: { id: proposal.id },
          data: { followUpSentAt: sentAt },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      eventType,
      to: contactEmail,
      publicUrl,
      messageId: emailResult.data?.id,
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
