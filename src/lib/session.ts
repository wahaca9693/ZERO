import { getIronSession } from "iron-session";
import { NextRequest, NextResponse } from "next/server";

export type SessionUser = {
  userId?: number;
  siteSlug?: string;
  role?: string;
};

export const sessionOptions = {
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

/**
 * Returns the authenticated reseller account from the iron-session cookie,
 * or null when the session is missing/invalid for the given slug.
 */
export async function getSiteSession(request: Request, slug: string) {
  const response = NextResponse.next();
  try {
    const session = await getIronSession<SessionUser>(request, response, sessionOptions);
    if (!session.userId || session.siteSlug !== slug) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Convenience wrapper for API routes: returns { ok: false, response } with a
 * 401 JSON when unauthenticated, or { ok: true, session, site } when valid.
 */
export async function requireSiteAuth(request: NextRequest | Request, slug: string) {
  const session = await getSiteSession(request, slug);
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "يرجى تسجيل الدخول إلى هذا الموقع أولاً." }, { status: 401 }),
    };
  }
  return { ok: true as const, session };
}