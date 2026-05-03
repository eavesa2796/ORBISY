import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateOneTimeToken,
  hashOneTimeToken,
  hashPassword,
} from "@/lib/auth";
import { authErrorToHttp, requireHvacUser } from "@/lib/session";
import { sendUserInviteEmail } from "@/lib/invite-email";

export const runtime = "nodejs";

function getInviteExpirationDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

function normalizeBaseUrl(request: Request) {
  const baseUrl =
    process.env.NEXT_PUBLIC_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin);

  return baseUrl.replace(/\/$/, "");
}

function fallbackNameFromEmail(email: string) {
  return email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Homeowner";
}

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

  try {
    const proposal = await prisma.salesProposal.findFirst({
      where: {
        id,
        companyId: session.customerCompanyId,
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true, email: true } },
        opportunity: { select: { id: true, title: true } },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { ok: false, error: "Proposal not found" },
        { status: 404 },
      );
    }

    const contactEmail = proposal.contact?.email?.trim().toLowerCase();
    if (!proposal.contact || !contactEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "Cannot invite homeowner: proposal contact email is missing",
        },
        { status: 422 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: contactEmail },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        customerCompanyId: true,
        customerContactId: true,
      },
    });

    if (existing && existing.role !== "HOMEOWNER") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "An account with this email already exists under a non-homeowner role",
        },
        { status: 409 },
      );
    }

    if (existing?.isActive) {
      const linkedToProposalCompany =
        existing.customerCompanyId === proposal.companyId;
      const linkedToProposalContact =
        existing.customerContactId === proposal.contactId;

      if (!linkedToProposalCompany && !linkedToProposalContact) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "An active homeowner account with this email is linked to another workspace",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        ok: true,
        alreadyActive: true,
        user: {
          id: existing.id,
          email: existing.email,
          role: existing.role,
        },
      });
    }

    if (
      existing?.customerCompanyId &&
      existing.customerCompanyId !== proposal.companyId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A pending homeowner account with this email is linked to another workspace",
        },
        { status: 409 },
      );
    }

    const name =
      proposal.contact.fullName?.trim() || fallbackNameFromEmail(contactEmail);
    const rawToken = generateOneTimeToken();
    const tokenHash = hashOneTimeToken(rawToken);
    const expiresAt = getInviteExpirationDate();

    const user = await prisma.$transaction(async (tx) => {
      const targetUser = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              name,
              role: "HOMEOWNER",
              isActive: false,
              customerCompanyId: proposal.companyId,
              customerContactId: proposal.contactId,
              password: hashPassword(generateOneTimeToken()),
            },
          })
        : await tx.user.create({
            data: {
              email: contactEmail,
              name,
              role: "HOMEOWNER",
              password: hashPassword(generateOneTimeToken()),
              isActive: false,
              customerCompanyId: proposal.companyId,
              customerContactId: proposal.contactId,
            },
          });

      await tx.inviteToken.updateMany({
        where: {
          userId: targetUser.id,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });

      await tx.inviteToken.create({
        data: {
          userId: targetUser.id,
          invitedByUserId: session.userId,
          tokenHash,
          email: contactEmail,
          role: "HOMEOWNER",
          customerCompanyId: proposal.companyId,
          customerContactId: proposal.contactId,
          expiresAt,
        },
      });

      return targetUser;
    });

    const setupUrl = `${normalizeBaseUrl(request)}/setup-password?token=${rawToken}`;
    const emailResult = await sendUserInviteEmail({
      to: contactEmail,
      inviteeName: name,
      inviterName: session.userName,
      role: "HOMEOWNER",
      setupUrl,
      companyName: proposal.company.name,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invite created but email failed to send: ${emailResult.error}`,
          inviteDeliveryFailed: true,
          ...(process.env.NODE_ENV !== "production" ? { setupUrl } : {}),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      invite: {
        email: contactEmail,
        role: "HOMEOWNER",
        expiresAt,
        userId: user.id,
        proposalId: proposal.id,
      },
      messageId: emailResult.messageId,
      ...(process.env.NODE_ENV !== "production" ? { setupUrl } : {}),
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
