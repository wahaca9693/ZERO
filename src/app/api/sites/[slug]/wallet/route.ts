import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { requireSiteAuth } from "@/lib/session";

type Row = Record<string, unknown>;

/**
 * GET /api/sites/{slug}/wallet
 * Balance + recent transactions + payment methods configured for the site.
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

    const accountResult = await db.execute({
      sql: "SELECT id, username, balance, role FROM reseller_accounts WHERE id = ? LIMIT 1",
      args: [auth.session.userId!],
    });
    const account = accountResult.rows[0] as unknown as Row | undefined;
    if (!account) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

    const txResult = await db.execute({
      sql: "SELECT id, type, amount, status, description, method, created_at FROM reseller_transactions WHERE account_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [auth.session.userId!],
    });

    return NextResponse.json({
      balance: Number(account.balance || 0),
      username: String(account.username),
      transactions: txResult.rows.map((row) => {
        const item = row as Row;
        return {
          id: Number(item.id),
          type: String(item.type),
          amount: Number(item.amount),
          status: String(item.status),
          description: item.description ? String(item.description) : "",
          method: item.method ? String(item.method) : "",
          created_at: String(item.created_at),
        };
      }),
      paymentMethods: site.paymentMethods,
    });
  } catch (error) {
    console.error("[site-wallet]", error);
    return NextResponse.json({ error: "تعذر تحميل المحفظة" }, { status: 500 });
  }
}