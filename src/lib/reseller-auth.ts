import { cookies } from "next/headers";
import { db, initDb } from "./db";
import { sessionOptions, type SessionUser } from "./session-config";
import { getIronSession } from "iron-session";

/**
 * Unified reseller session helpers.
 *
 * All branch auth (register/login/me) stores the session in the SAME
 * iron-session cookie (`reseller_session`) with fields:
 *   userId   -> reseller_accounts.id
 *   siteSlug -> the branch slug
 *   role     -> "admin" | "user"
 *
 * requireResellerAccount / requireResellerAdmin read THAT same session so
 * branch admins never hit "غير مصرح" after login.
 */

interface ResellerAccountRow {
  id: number;
  site_id: number;
  username: string;
  email?: string;
  role: string;
  is_banned: number;
  balance: number;
}

export async function requireResellerAccount(slug: string, requiredRole?: "admin" | "user") {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionUser>(cookieStore, sessionOptions);
  if (!session.userId || typeof session.userId !== "number" || session.siteSlug !== slug) {
    throw new Error("Unauthorized");
  }
  await initDb();

  const result = await db.execute({
    sql: `SELECT a.id, a.site_id, a.username, a.email, a.role, a.is_banned, a.balance
          FROM reseller_accounts a
          JOIN reseller_sites s ON s.id = a.site_id
          WHERE a.id = ? AND s.slug = ? LIMIT 1`,
    args: [session.userId, slug],
  });
  const account = result.rows[0] as unknown as ResellerAccountRow | undefined;
  if (!account || Number(account.is_banned) === 1) throw new Error("Unauthorized");

  if (requiredRole && String(account.role) !== requiredRole) throw new Error("Forbidden");

  return { session, account };
}

export async function requireResellerAdmin(slug: string) {
  return requireResellerAccount(slug, "admin");
}