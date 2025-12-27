import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check if user is trying to access /console routes
  if (request.nextUrl.pathname.startsWith("/console")) {
    // Check for authentication cookie
    const authToken = request.cookies.get("auth-token")?.value;

    // If no auth token, redirect to login
    if (!authToken || authToken !== process.env.AUTH_TOKEN) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: ["/console/:path*", "/console"],
};
