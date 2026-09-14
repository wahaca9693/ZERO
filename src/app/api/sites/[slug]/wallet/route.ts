import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { requireSiteAuth } from "@/lib/session";

type Row = Record<string, unknown>;

/**
 * GET /api/sites/{slug}/wallet
 * Returns the OFFICIAL platform wallet balance (shared with branch owner).
 * Branch wallet IS the official wallet — automatic linking.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
    const site = publicSiteData(loaded.site, origin, loaded.expired);

    // Get the site owner's official wallet (users table via owner_user_id)
    const ownerResult = await db.execute({
      sql: "SELECT owner_user_id FROM reseller_sites WHERE id = ? LIMIT 1",
      args: [Number(loaded.site.id)],
    });
    const ownerRow = ownerResult.rows[0] as unknown as Row | undefined;
    const ownerUserId = Number(ownerRow?.owner_user_id || 0);

    let balance = 0;
    let username = "";
    let officialTransactions: Row[] = [];

    if (ownerUserId > 0) {
      const userResult = await db.execute({
        sql: "SELECT id, username, balance FROM users WHERE id = ? LIMIT 1",
        args: [ownerUserId],
      });
      const user = userResult.rows[0] as unknown as Row | undefined;
      if (user) {
        balance = Number(user.balance || 0);
        username = String(user.username || "");
      }

      // Get official transactions (deposits/withdrawals from main platform)
      const txResult = await db.execute({
        sql: "SELECT id, type, amount, status, description, method, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        args: [ownerUserId],
      });
      officialTransactions = txResult.rows;
    }

    // Also include branch-specific transactions for this account
    const branchTxResult = await db.execute({
      sql: "SELECT id, type, amount, status, description, method, created_at FROM reseller_transactions WHERE account_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [auth.session.userId!],
    });

    return NextResponse.json({
      balance,
      username: String(officialTransactions[0]?.username || site.displayName), // fallback
      transactions: [
        ...officialTransactions.map((row) => {
          const item = row as Row;
          return {
            id: Number(item.id),
            type: String(item.type),
            amount: Number(item.amount),
            status: String(item.status),
            description: item.description ? String(item.description) : "",
            method: item.method ? String(item.method) : "",
            created_at: String(item.created_at),
            source: "official",
          };
        }),
        ...branchTxResult.rows.map((row) => {
          const item = row as Row;
          return {
            id: Number(item.id),
            type: String(item.type),
            amount: Number(item.amount),
            status: String(item.status),
            description: item.description ? String(item.description) : "",
            method: item.method ? String(item.method) : "",
            created_at: String(item.created_at),
            source: "branch",
          };
        }),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      paymentMethods: site.paymentMethods,
      linked: true, // wallet is linked to official platform
      officialUserId: ownerUserId,
    });
  } catch (error) {
    console.error("[site-wallet]", error);
    return NextResponse.json({ error: "تعذر تحميل المحفظة" }, { status: 500 });
  }
}