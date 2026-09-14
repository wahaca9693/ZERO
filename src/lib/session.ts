import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

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
 * Reads the iron-session session from the request cookies.
 * Use this inside API route handlers to check authentication.
 */
export async function getSiteSession(slug: string) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionUser>(cookieStore, sessionOptions);
    if (!session.userId || session.siteSlug !== slug) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Convenience wrapper for API routes: returns { ok: false } with 401 JSON when
 * unauthenticated, or { ok: true, session } when valid.
 */
export async function requireSiteAuth(slug: string) {
  const session = await getSiteSession(slug);
  if (!session) {
    return {
      ok: false as const,
      response: new Response(JSON.stringify({ error: "يرجى تسجيل الدخول إلى هذا الموقع أولاً." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { ok: true as const, session };
}