import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ironSession } from "iron-session";
import { getIronSession } from "iron-session/edge";

const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_chars_long_for_security",
  cookieName: "reseller_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  },
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Check if it's a reseller site route
  const siteMatch = pathname.match(/^\/sites\/([^/]+)\/(app\/(.+))/);
  if (!siteMatch) return NextResponse.next();
  
  const slug = siteMatch[1];
  const route = siteMatch[2];
  
  // Public routes that don't require authentication
  const publicRoutes = [`/sites/${slug}/login`];
  if (publicRoutes.some(p => pathname.startsWith(p))) return NextResponse.next();
  
  // For protected routes, check session
  const response = NextResponse.next();
  
  try {
    const session = await getIronSession(request, response, sessionOptions);
    const isAuthenticated = session.userId && session.slug === slug;
    
    if (!isAuthenticated && !publicRoutes.includes(pathname)) {
      const loginUrl = new URL(`/sites/${slug}/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Add user info to headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-reseller-user-id", session.userId || "");
    requestHeaders.set("x-reseller-slug", slug);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    const loginUrl = new URL(`/sites/${slug}/login`, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/sites/:slug/(app)/:path*",
    "/sites/:slug/dashboard/:path*",
    "/sites/:slug/services/:path*",
    "/sites/:slug/wallet/:path*",
    "/sites/:slug/profile/:path*",
    "/sites/:slug/settings/:path*",
    "/sites/:slug/orders/:path*",
    "/sites/:slug/tickets/:path*",
    "/sites/:slug/deposit/:path*",
    "/sites/:slug/withdraw/:path*",
  ],
}