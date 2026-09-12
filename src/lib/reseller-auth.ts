import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { db, initDb } from "./db";

export interface ResellerSessionData {
  accountId?: number;
  siteId?: number;
  username?: string;
  role?: "admin" | "user";
  isLoggedIn?: boolean;
}

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be configured with at least 32 characters");

function safeSlug(slug: string) {
  return slug.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 48) || "site";
}

function options(slug: string): SessionOptions {
  return {
    password: secret!,
    cookieName: `trendcom-site-${safeSlug(slug)}-session`,
    cookieOptions: {
      secure: process.env.SESSION_COOKIE_SECURE === "0" ? false : process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: `/sites/${encodeURIComponent(slug)}`,
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export async function getResellerSession(slug: string) {
  return getIronSession<ResellerSessionData>(await cookies(), options(slug));
}

export async function requireResellerAccount(slug: string, requiredRole?: "admin" | "user") {
  const session = await getResellerSession(slug);
  if (!session.isLoggedIn || typeof session.accountId !== "number" || typeof session.siteId !== "number") throw new Error("Unauthorized");
  await initDb();
  const result = await db.execute({
    sql: `SELECT a.id, a.site_id, a.username, a.role, a.is_banned, s.status, s.next_billing_at
          FROM reseller_accounts a JOIN reseller_sites s ON s.id = a.site_id
          WHERE a.id = ? AND s.slug = ? LIMIT 1`,
    args: [session.accountId, slug],
  });
  const account = result.rows[0] as Record<string, unknown> | undefined;
  if (!account || Number(account.is_banned) === 1 || String(account.status) !== "active") throw new Error("Unauthorized");
  const expiry = account.next_billing_at ? new Date(String(account.next_billing_at)).getTime() : 0;
  if (expiry && expiry <= Date.now()) throw new Error("SubscriptionExpired");
  if (requiredRole && String(account.role) !== requiredRole) throw new Error("Forbidden");
  return { session, account };
}
