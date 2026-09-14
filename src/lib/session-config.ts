export type SessionUser = {
  userId?: number;
  siteSlug?: string;
  role?: string;
};

// Pure config — NO imports at all, so this file is safe to import from both
// Edge runtime (middleware) and Node runtime (API routes).
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