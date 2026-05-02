import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  generateSessionToken,
  getSessionExpiration,
} from "@/lib/auth";

function getDevelopmentDiagnostic(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Database connection failed. Check DATABASE_URL and confirm PostgreSQL is running.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return "An auth table is missing. Run prisma migrate deploy against the configured database.";
    }

    if (error.code === "P2022") {
      return "The auth schema is out of date. Regenerate Prisma Client and re-run migrations.";
    }

    return `Prisma request failed with code ${error.code}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Verify password
    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiration();

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    const isProduction = process.env.NODE_ENV === "production";

    response.cookies.set("session-token", sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV !== "production";

    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: "Authentication failed",
        ...(isDevelopment
          ? { diagnostic: getDevelopmentDiagnostic(error) }
          : {}),
      },
      { status: 500 },
    );
  }
}
