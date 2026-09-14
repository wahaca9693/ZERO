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
      sql: `SELECT t.id, t.type, t.amount, t.status, t.description, t.method, t.created_at, a.username AS account_username
            FROM reseller_transactions t
            LEFT JOIN reseller_accounts a ON a.id = t.account_id
            WHERE t.site_id = ? AND (t.type = 'deposit' OR t.method LIKE '%crypto%' OR t.method LIKE '%usdt%' OR t.method LIKE '%nowpayments%')
            ORDER BY t.created_at DESC LIMIT 100`,
      args: [siteId],
    });
    const deposits = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id), type: String(r.type || ""), amount: Number(r.amount || 0),
        status: String(r.status || ""), description: r.description ? String(r.description) : "",
        method: r.method ? String(r.method) : "crypto", createdAt: r.created_at ? String(r.created_at) : "",
        account: r.account_username ? String(r.account_username) : "",
      };
    });
    return NextResponse.json({ deposits });
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
    const { id, action } = body as { id?: number; action?: "approve" | "reject" };
    if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
    const status = action === "approve" ? "completed" : "failed";
    await db.execute({
      sql: "UPDATE reseller_transactions SET status = ? WHERE id = ? AND site_id = ? AND type = 'deposit'",
      args: [status, id, siteId],
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
