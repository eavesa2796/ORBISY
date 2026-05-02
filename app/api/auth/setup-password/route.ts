import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateSessionToken,
  getSessionExpiration,
  hashOneTimeToken,
  hashPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

type SetupPasswordPayload = {
  token?: string;
  password?: string;
  name?: string;
};

function roleToDefaultPath(role: string) {
  if (role === "HOMEOWNER") {
    return "/portal";
  }

  if (role === "HVAC_OWNER" || role === "HVAC_SALES") {
    return "/pro";
  }

  return "/console";
}

async function findValidInviteByToken(token: string) {
  const invite = await prisma.inviteToken.findUnique({
    where: { tokenHash: hashOneTimeToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!invite) {
    return null;
  }

  if (invite.usedAt) {
    return null;
  }

  if (invite.expiresAt < new Date()) {
    return null;
  }

  return invite;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Invite token is required" },
      { status: 400 },
    );
  }

  const invite = await findValidInviteByToken(token);
  if (!invite) {
    return NextResponse.json(
      { ok: false, error: "Invite is invalid or expired" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    invite: {
      email: invite.email,
      name: invite.user.name,
      role: invite.role,
      expiresAt: invite.expiresAt,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SetupPasswordPayload;
    const token = body.token?.trim() || "";
    const password = body.password?.trim() || "";
    const name = body.name?.trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Invite token is required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const invite = await findValidInviteByToken(token);
    if (!invite) {
      return NextResponse.json(
        { ok: false, error: "Invite is invalid or expired" },
        { status: 400 },
      );
    }

    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiration();

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: invite.userId },
        data: {
          password: hashPassword(password),
          isActive: true,
          lastLoginAt: new Date(),
          ...(name ? { name } : {}),
          role: invite.role,
          customerCompanyId: invite.customerCompanyId || null,
          customerContactId: invite.customerContactId || null,
        },
      });

      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      await tx.inviteToken.deleteMany({
        where: {
          userId: invite.userId,
          usedAt: null,
          id: { not: invite.id },
        },
      });

      await tx.session.create({
        data: {
          userId: updatedUser.id,
          token: sessionToken,
          expiresAt,
        },
      });

      return updatedUser;
    });

    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectPath: roleToDefaultPath(user.role),
    });

    response.cookies.set("session-token", sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
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
