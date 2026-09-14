import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    const [usersRes, ordersRes, txRes] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as c FROM reseller_accounts WHERE site_id = ?", args: [siteId] }),
      db.execute({ sql: "SELECT COUNT(*) as c, COALESCE(SUM(charge),0) as total FROM reseller_orders WHERE site_id = ?", args: [siteId] }),
      db.execute({ sql: "SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as total FROM reseller_transactions WHERE site_id = ? AND status = 'completed'", args: [siteId] }),
    ]);

    const users = Number((usersRes.rows[0] as { c?: unknown } | undefined)?.c || 0);
    const orders = Number((ordersRes.rows[0] as { c?: unknown } | undefined)?.c || 0);
    const ordersTotal = Number((ordersRes.rows[0] as { total?: unknown } | undefined)?.total || 0);
    const txCount = Number((txRes.rows[0] as { c?: unknown } | undefined)?.c || 0);
    const txTotal = Number((txRes.rows[0] as { total?: unknown } | undefined)?.total || 0);

    return NextResponse.json({ stats: { users, orders, ordersTotal, txCount, txTotal } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}