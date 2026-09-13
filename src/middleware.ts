import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";

const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_chars_long_for_security",
  cookieName: "reseller_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  const siteMatch = pathname.match(/^\/sites\/([^/]+)\/(.+)/);
  if (!siteMatch) return NextResponse.next();
  
  const slug = siteMatch[1];
  
  const publicRoutes = [`/sites/${slug}/login`, `/sites/${slug}/register`, `/sites/${slug}`];
  if (publicRoutes.some(p => pathname.startsWith(p))) return NextResponse.next();
  
  const response = NextResponse.next();
  
  try {
    const session = await getIronSession(request, response, sessionOptions);
    const isAuthenticated = session.userId && session.slug === slug;
    
    if (!isAuthenticated) {
      const loginUrl = new URL(`/sites/${slug}/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
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
    "/sites/:slug/:path*",
  ],
};