import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";
import { getAdminRow } from "@/lib/asiacell-gateway";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);
    const [txs, admin] = await Promise.all([
      db.execute({
        sql: `SELECT t.id, t.amount, t.status, t.description, t.method, t.created_at, a.username AS account_username
              FROM reseller_transactions t
              LEFT JOIN reseller_accounts a ON a.id = t.account_id
              WHERE t.site_id = ? AND (t.method = 'asiacell' OR t.description LIKE '%آسياسيل%' OR t.description LIKE '%اسيا سيل%')
              ORDER BY t.created_at DESC LIMIT 100`,
        args: [siteId],
      }),
      getAdminRow(),
    ]);
    const charges = txs.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id), amount: Number(r.amount || 0), status: String(r.status || ""),
        description: r.description ? String(r.description) : "", method: r.method ? String(r.method) : "asiacell",
        account: r.account_username ? String(r.account_username) : "", createdAt: r.created_at ? String(r.created_at) : "",
      };
    });
    return NextResponse.json({
      charges,
      gateway: {
        connected: !!admin?.store_phone || !!admin?.phone,
        storePhone: admin?.store_phone || admin?.phone || "",
        exchangeRate: admin?.exchange_rate || 1666,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
