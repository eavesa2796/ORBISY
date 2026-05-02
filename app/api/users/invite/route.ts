import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateOneTimeToken,
  hashOneTimeToken,
  hashPassword,
} from "@/lib/auth";
import { authErrorToHttp, requireAdmin } from "@/lib/session";
import { sendUserInviteEmail } from "@/lib/invite-email";

export const runtime = "nodejs";

const INVITABLE_ROLES = [
  "ORBISY_SALES",
  "HVAC_OWNER",
  "HVAC_SALES",
  "HOMEOWNER",
] as const;

type InvitableRole = (typeof INVITABLE_ROLES)[number];

type InvitePayload = {
  email?: string;
  name?: string;
  role?: string;
  customerCompanyId?: string | null;
  customerContactId?: string | null;
};

function isInvitableRole(role: string): role is InvitableRole {
  return INVITABLE_ROLES.includes(role as InvitableRole);
}

function getInviteExpirationDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

function normalizeBaseUrl(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_URL || request.nextUrl.origin).replace(
    /\/$/,
    "",
  );
}

async function resolveCustomerLinks(
  role: InvitableRole,
  customerCompanyIdInput?: string | null,
  customerContactIdInput?: string | null,
) {
  const customerCompanyId = customerCompanyIdInput?.trim() || null;
  const customerContactId = customerContactIdInput?.trim() || null;

  if (role === "ORBISY_SALES") {
    return {
      customerCompanyId: null,
      customerContactId: null,
      companyName: null,
    };
  }

  let linkedCompanyId = customerCompanyId;
  const linkedContactId = customerContactId;
  let companyName: string | null = null;

  if ((role === "HVAC_OWNER" || role === "HVAC_SALES") && !linkedCompanyId) {
    throw new Error("HVAC users must be linked to a company workspace");
  }

  if (role === "HOMEOWNER" && !linkedCompanyId && !linkedContactId) {
    throw new Error("Homeowner invites must be linked to a company or contact");
  }

  if (linkedContactId) {
    const contact = await prisma.salesContact.findUnique({
      where: { id: linkedContactId },
      select: {
        id: true,
        companyId: true,
        company: { select: { id: true, name: true } },
      },
    });

    if (!contact) {
      throw new Error("Contact not found");
    }

    if (linkedCompanyId && linkedCompanyId !== contact.companyId) {
      throw new Error("Contact does not belong to the selected company");
    }

    linkedCompanyId = contact.companyId;
    companyName = contact.company.name;
  }

  if (linkedCompanyId) {
    const company = await prisma.salesCompany.findUnique({
      where: { id: linkedCompanyId },
      select: { id: true, name: true },
    });

    if (!company) {
      throw new Error("Company not found");
    }

    companyName = company.name;
  }

  if (!linkedCompanyId) {
    throw new Error("A linked company is required for this invite");
  }

  return {
    customerCompanyId: linkedCompanyId,
    customerContactId: linkedContactId,
    companyName,
  };
}

export async function POST(request: NextRequest) {
  let session: Awaited<ReturnType<typeof requireAdmin>>;

  try {
    session = await requireAdmin();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status },
      );
    }
    throw error;
  }

  try {
    const body = (await request.json()) as InvitePayload;
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const role = body.role || "HOMEOWNER";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "A valid email is required" },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Name is required" },
        { status: 400 },
      );
    }

    if (!isInvitableRole(role)) {
      return NextResponse.json(
        { ok: false, error: "Invalid invite role" },
        { status: 400 },
      );
    }

    const links = await resolveCustomerLinks(
      role,
      body.customerCompanyId,
      body.customerContactId,
    );

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.isActive) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "An active user with this email already exists. Deactivate first to re-invite.",
        },
        { status: 409 },
      );
    }

    const rawToken = generateOneTimeToken();
    const tokenHash = hashOneTimeToken(rawToken);
    const expiresAt = getInviteExpirationDate();

    const user = await prisma.$transaction(async (tx) => {
      const targetUser = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              name,
              role,
              customerCompanyId: links.customerCompanyId,
              customerContactId: links.customerContactId,
              isActive: false,
              password: hashPassword(generateOneTimeToken()),
            },
          })
        : await tx.user.create({
            data: {
              email,
              name,
              role,
              password: hashPassword(generateOneTimeToken()),
              isActive: false,
              customerCompanyId: links.customerCompanyId,
              customerContactId: links.customerContactId,
            },
          });

      await tx.inviteToken.updateMany({
        where: {
          userId: targetUser.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.inviteToken.create({
        data: {
          userId: targetUser.id,
          invitedByUserId: session.userId,
          tokenHash,
          email,
          role,
          customerCompanyId: links.customerCompanyId,
          customerContactId: links.customerContactId,
          expiresAt,
        },
      });

      return targetUser;
    });

    const setupUrl = `${normalizeBaseUrl(request)}/setup-password?token=${rawToken}`;

    const emailResult = await sendUserInviteEmail({
      to: email,
      inviteeName: name,
      inviterName: session.userName,
      role,
      setupUrl,
      companyName: links.companyName || undefined,
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
        email,
        role,
        expiresAt,
        userId: user.id,
      },
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
