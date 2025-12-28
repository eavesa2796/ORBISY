import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function middleware(request: NextRequest) {
  // Check if user is trying to access /console routes
  if (request.nextUrl.pathname.startsWith("/console")) {
    // Check for session cookie
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Validate session from database
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true },
      });

      // Check if session exists, is valid, and user is active
      if (
        !session ||
        session.expiresAt < new Date() ||
        !session.user.isActive
      ) {
        // Delete expired/invalid session
        if (session) {
          await prisma.session.delete({ where: { id: session.id } });
        }

        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Session is valid, allow access
      return NextResponse.next();
    } catch (error) {
      console.error("Middleware error:", error);
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: ["/console/:path*", "/console"],
};
