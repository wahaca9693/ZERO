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
      sql: "SELECT id, title, body, created_at FROM reseller_notifications WHERE site_id = ? ORDER BY created_at DESC LIMIT 100",
      args: [siteId],
    });
    const notifications = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return { id: Number(r.id), title: String(r.title || ""), body: r.body ? String(r.body) : "", createdAt: r.created_at ? String(r.created_at) : "" };
    });
    return NextResponse.json({ notifications });
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
    const { title, body: content } = body as { title?: string; body?: string };
    if (!title || !title.trim()) return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
    await db.execute({
      sql: "INSERT INTO reseller_notifications (site_id, title, body) VALUES (?, ?, ?)",
      args: [siteId, title.trim(), content || ""],
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
