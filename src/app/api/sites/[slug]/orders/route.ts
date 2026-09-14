import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireSiteAuth } from "@/lib/session";

type OrderRow = Record<string, unknown>;

/**
 * GET /api/sites/{slug}/orders?status=...
 * Orders belonging to the logged-in reseller account.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(request, slug);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let sql = "SELECT * FROM reseller_orders WHERE account_id = ?";
    const args: Array<string | number> = [auth.session.userId!];

    if (status && status !== "all") {
      sql += " AND status = ?";
      args.push(status);
    }
    sql += " ORDER BY created_at DESC LIMIT 200";

    const result = await db.execute({ sql, args });
    const orders = result.rows.map((row) => {
      const item = row as OrderRow;
      return {
        ...item,
        id: Number(item.id),
        service_id: Number(item.service_id),
        charge: Number(item.charge),
        quantity: Number(item.quantity),
        start_count: item.start_count != null ? Number(item.start_count) : null,
        remains: item.remains != null ? Number(item.remains) : null,
      };
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[site-orders]", error);
    return NextResponse.json({ error: "تعذر تحميل الطلبات" }, { status: 500 });
  }
}