import type { SessionOptions } from "iron-session";

export type SessionUser = {
  userId?: number;
  siteSlug?: string;
  role?: string;
};

// Pure config — NO runtime imports from iron-session at module load (type-only),
// so this file is safe to import from both Edge runtime (middleware) and Node
// runtime (API routes).
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_chars_long_for_security",
  cookieName: "reseller_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 يوم — الجلسة تبقى حتى لو لم يعُد المستخدم
    path: "/",
  },
};

/**
 * Builds session options with a site-specific cookie name
 * (`reseller_session_<slug>`), so each branch keeps its OWN independent
 * session — logging in/out of one branch NEVER affects another branch,
 * and users stay logged in to every branch they joined.
 */
export function siteSessionOptions(slug: string): SessionOptions {
  const safeSlug = String(slug || "site").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
  return {
    ...sessionOptions,
    cookieName: `reseller_session_${safeSlug}`,
  };
}