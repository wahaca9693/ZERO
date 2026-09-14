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
      sql: "SELECT id, label, href, icon, sort_order, enabled FROM reseller_navigation WHERE site_id = ? ORDER BY sort_order ASC, id ASC LIMIT 100",
      args: [siteId],
    });
    const items = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id), label: String(r.label || ""), href: String(r.href || ""),
        icon: String(r.icon || "Globe"), sortOrder: Number(r.sort_order || 0),
        enabled: Number(r.enabled || 0) === 1,
      };
    });
    return NextResponse.json({ items });
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
    const { id, action, label, href, icon, sortOrder } = body as {
      id?: number; action?: string; label?: string; href?: string; icon?: string; sortOrder?: number;
    };

    if (action === "delete" && id) {
      await db.execute({ sql: "DELETE FROM reseller_navigation WHERE id = ? AND site_id = ?", args: [id, siteId] });
      return NextResponse.json({ success: true });
    }
    if (action === "toggle" && id) {
      await db.execute({ sql: "UPDATE reseller_navigation SET enabled = CASE enabled WHEN 1 THEN 0 ELSE 1 END WHERE id = ? AND site_id = ?", args: [id, siteId] });
      return NextResponse.json({ success: true });
    }
    if (!label || !href) return NextResponse.json({ error: "label و href مطلوبان" }, { status: 400 });
    await db.execute({
      sql: "INSERT INTO reseller_navigation (site_id, label, href, icon, sort_order, enabled) VALUES (?, ?, ?, ?, ?, 1)",
      args: [siteId, label, href, icon || "Globe", Number(sortOrder || 0)],
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}