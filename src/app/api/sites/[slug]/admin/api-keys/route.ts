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
      sql: "SELECT id, name, key_value, enabled, created_at, last_used_at FROM reseller_api_keys WHERE site_id = ? ORDER BY created_at DESC LIMIT 100",
      args: [siteId],
    });
    const keys = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id), name: r.name ? String(r.name) : "", key: String(r.key_value || ""),
        enabled: Number(r.enabled || 0) === 1, createdAt: r.created_at ? String(r.created_at) : "",
        lastUsedAt: r.last_used_at ? String(r.last_used_at) : null,
      };
    });
    return NextResponse.json({ keys });
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
    const { name, id, action } = body as { name?: string; id?: number; action?: "delete" | "toggle" | "create" };

    if (action === "delete" && id) {
      await db.execute({ sql: "DELETE FROM reseller_api_keys WHERE id = ? AND site_id = ?", args: [id, siteId] });
      return NextResponse.json({ success: true });
    }
    if (action === "toggle" && id) {
      await db.execute({ sql: "UPDATE reseller_api_keys SET enabled = CASE enabled WHEN 1 THEN 0 ELSE 1 END WHERE id = ? AND site_id = ?", args: [id, siteId] });
      return NextResponse.json({ success: true });
    }
    const keyValue = `bs_${slug}_${Math.random().toString(36).slice(2, 18)}${Date.now().toString(36)}`;
    await db.execute({
      sql: "INSERT INTO reseller_api_keys (site_id, account_id, name, key_value) VALUES (?, ?, ?, ?)",
      args: [siteId, auth.account.id, name || "مفتاح API", keyValue],
    });
    return NextResponse.json({ success: true, key: keyValue });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
