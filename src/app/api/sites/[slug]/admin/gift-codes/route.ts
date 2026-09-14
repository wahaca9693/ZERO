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
    const result = await db.execute({
      sql: "SELECT id, code, amount, status, created_at, redeemed_by, redeemed_at FROM reseller_gift_codes WHERE site_id = ? ORDER BY created_at DESC LIMIT 100",
      args: [siteId],
    });
    const codes = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id), code: String(r.code || ""), amount: Number(r.amount || 0),
        status: String(r.status || "active"), createdAt: r.created_at ? String(r.created_at) : "",
        redeemedBy: r.redeemed_by ? Number(r.redeemed_by) : null, redeemedAt: r.redeemed_at ? String(r.redeemed_at) : null,
      };
    });
    return NextResponse.json({ codes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);
    const body = await request.json();
    const { amount, count = 1 } = body as { amount?: number; count?: number };
    const value = Number(amount || 0);
    if (value <= 0) return NextResponse.json({ error: "المبلغ غير صالح" }, { status: 400 });
    const n = Math.min(Math.max(Number(count) || 1, 1), 100);
    const created = [];
    for (let i = 0; i < n; i++) {
      const code = `GIFT-${Math.random().toString(36).slice(2, 10).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
      await db.execute({
        sql: "INSERT INTO reseller_gift_codes (site_id, code, amount, created_by) VALUES (?, ?, ?, ?)",
        args: [siteId, code, value, auth.account.id],
      });
      created.push(code);
    }
    return NextResponse.json({ success: true, codes: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
