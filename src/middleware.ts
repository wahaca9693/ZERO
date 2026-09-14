import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionOptions, type SessionUser } from "@/lib/session-config";
import { getIronSession } from "iron-session";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rewrite reseller API calls from /sites/{slug}/api/... to /api/sites/{slug}/...
  // so shared components (Header/Sidebar) can use the same code on the branch.
  const apiMatch = pathname.match(/^\/sites\/([^/]+)\/api\/(.+)$/);
  if (apiMatch) {
    const slug = apiMatch[1];
    const rest = apiMatch[2];
    const rewritten = new URL(`/api/sites/${encodeURIComponent(slug)}/${rest}`, request.url);
    return NextResponse.rewrite(rewritten);
  }

  // Protect main-platform page /my-sites (requires login)
  if (pathname === "/my-sites" || pathname.startsWith("/my-sites/")) {
    try {
      const session = await getIronSession<SessionUser>(request, response, sessionOptions);
      if (!session.userId && !session.isLoggedIn) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    } catch {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Only intercept reseller site protected pages (portal + dashboard areas).
    // Services are public for guests, mirroring the main platform (/services).
    const match = pathname.match(/^\/sites\/([^/]+)\/(dashboard|orders|wallet|deposit|transactions|profile|admin)(\/|$)/);
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
  matcher: ["/sites/:slug/:path*", "/my-sites", "/my-sites/:path*"],
};