import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    let sql = "SELECT * FROM reseller_orders WHERE site_id = ?";
    const args: Array<string | number> = [siteId];
    if (status && status !== "all") {
      sql += " AND status = ?";
      args.push(status);
    }
    sql += " ORDER BY created_at DESC LIMIT 200";

    const result = await db.execute({ sql, args });
    const orders = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: Number(r.id),
        account_id: Number(r.account_id),
        service_name: String(r.service_name || ""),
        link: String(r.link || ""),
        quantity: Number(r.quantity || 0),
        charge: Number(r.charge || 0),
        status: String(r.status || "Pending"),
        created_at: String(r.created_at || ""),
      };
    });

    return NextResponse.json({ orders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}