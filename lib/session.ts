/**
 * Session validation utilities (Node.js runtime only)
 */

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface ValidatedSession {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: "ADMIN" | "USER";
}

/**
 * Validate the current session from cookies
 * Returns the user info if valid, null otherwise
 * Use this in Server Components and API routes
 */
export async function validateSession(): Promise<ValidatedSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    if (!sessionToken) {
      return null;
    }

    // Validate session from database
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    // Check if session exists, is valid, and user is active
    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      // Delete expired/invalid session
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }

    // Return validated session info
    return {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      userRole: session.user.role,
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

/**
 * Require a valid session or throw an error
 * Use this in API routes that require authentication
 */
export async function requireSession(): Promise<ValidatedSession> {
  const session = await validateSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Require admin role or throw an error
 * Use this in API routes that require admin access
 */
export async function requireAdmin(): Promise<ValidatedSession> {
  const session = await requireSession();
  if (session.userRole !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}
