import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionOptions, type SessionUser } from "@/lib/session-config";
import { getIronSession } from "iron-session";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only intercept reseller site protected pages (portal + dashboard areas).
  // Services are public for guests, mirroring the main platform (/services).
  const match = pathname.match(/^\/sites\/([^/]+)\/(dashboard|orders|wallet|deposit|transactions|profile)(\/|$)/);
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