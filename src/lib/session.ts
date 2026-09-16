import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, siteSessionOptions, type SessionUser } from "./session-config";

// Node-runtime only helpers (API routes). Middleware must NOT import this file;
// it imports session-config.ts directly instead.
export type { SessionUser } from "./session-config";

/**
 * Reads the iron-session session from the request cookies.
 * Also refreshes (slides) the session expiry on every successful read,
 * so an active user NEVER gets logged out.
 */
export async function getSiteSession(slug: string) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionUser>(cookieStore, siteSessionOptions(slug));
    if (!session.userId || session.siteSlug !== slug) return null;
    // Slide: renew the 30-day expiry on every active use
    await session.save();
    return session;
  } catch {
    return null;
  }
}

/**
 * Convenience wrapper for API routes.
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

export { sessionOptions, siteSessionOptions };