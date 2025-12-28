import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check if user is trying to access /console routes
  if (request.nextUrl.pathname.startsWith("/console")) {
    // Check for session cookie
    const sessionToken = request.cookies.get("session-token")?.value;

    // If no session token, redirect to login
    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Let the request proceed - session will be validated in the actual routes
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: ["/console/:path*", "/console"],
};
