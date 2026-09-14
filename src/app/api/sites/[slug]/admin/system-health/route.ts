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

    const [users, orders, pendingOrders, txs, tickets, keys] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as c FROM reseller_accounts WHERE site_id = ?", args: [siteId] }),
      db.execute({ sql: "SELECT COUNT(*) as c FROM reseller_orders WHERE site_id = ?", args: [siteId] }),
      db.execute({ sql: "SELECT COUNT(*) as c FROM reseller_orders WHERE site_id = ? AND status = 'processing'", args: [siteId] }),
      db.execute({ sql: "SELECT COUNT(*) as c FROM reseller_transactions WHERE site_id = ?", args: [siteId] }),
      db.execute({ sql: "SELECT COUNT(*) as c FROM reseller_tickets WHERE site_id = ? AND status = 'open'", args: [siteId] }),
      db.execute({ sql: "SELECT COUNT(*) as c FROM reseller_api_keys WHERE site_id = ? AND enabled = 1", args: [siteId] }),
    ]);
    const c = (r: unknown) => Number((r as unknown as Record<string, unknown>[])[0]?.c || 0);
    return NextResponse.json({
      health: {
        status: "ok",
        database: "connected",
        users: c(users.rows), orders: c(orders.rows), pendingOrders: c(pendingOrders.rows),
        transactions: c(txs.rows), openTickets: c(tickets.rows), activeApiKeys: c(keys.rows),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
