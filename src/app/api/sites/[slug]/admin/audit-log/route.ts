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
      sql: `SELECT l.id, l.action, l.details, l.created_at, a.username AS actor
            FROM reseller_audit_logs l
            LEFT JOIN reseller_accounts a ON a.id = l.account_id
            WHERE l.site_id = ? ORDER BY l.created_at DESC LIMIT 100`,
      args: [siteId],
    });
    const logs = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id), action: String(r.action || ""), details: r.details ? String(r.details) : "",
        createdAt: r.created_at ? String(r.created_at) : "", actor: r.actor ? String(r.actor) : "—",
      };
    });
    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
