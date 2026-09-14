import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionOptions, type SessionUser } from "@/lib/session";
import { getIronSession } from "iron-session";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only intercept reseller site protected pages (portal + dashboard areas)
  const match = pathname.match(/^\/sites\/([^/]+)\/(dashboard|services|orders|wallet)(\/|$)/);
  if (!match) return NextResponse.next();

  const slug = match[1];
  const response = NextResponse.next();
  try {
    const session = await getIronSession<SessionUser>(request, response, sessionOptions);
    const isAuthenticated = session.userId && session.siteSlug === slug;
    if (!isAuthenticated && !pathname.startsWith(`/sites/${encodeURIComponent(slug)}/login`)) {
      const loginUrl = new URL(`/sites/${encodeURIComponent(slug)}/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const headers = new Headers(request.headers);
    headers.set("x-reseller-user-id", String(session.userId || ""));
    headers.set("x-reseller-slug", slug);
    return NextResponse.next({ request: { headers } });
  } catch {
    const loginUrl = new URL(`/sites/${encodeURIComponent(slug)}/login`, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/sites/:slug/:path*"],
};