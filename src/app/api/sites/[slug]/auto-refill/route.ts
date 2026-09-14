import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireSiteAuth } from "@/lib/session";

type Params = { params: Promise<{ slug: string }> };
type AutoRefillBody = {
  service_id?: unknown;
  service_name?: unknown;
  link?: unknown;
  target_quantity?: unknown;
  interval_hours?: unknown;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

function serialize(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    account_id: Number(row.account_id),
    service_id: String(row.service_id ?? ""),
    service_name: String(row.service_name || ""),
    link: String(row.link || ""),
    target_quantity: Number(row.target_quantity || 0),
    interval_hours: Number(row.interval_hours || 0),
    is_active: Number(row.is_active ?? 1),
    created_at: String(row.created_at || ""),
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const result = await db.execute({
      sql: "SELECT * FROM auto_refills WHERE user_id = ? ORDER BY created_at DESC",
      args: [auth.session.userId!],
    });
    return NextResponse.json({ refills: result.rows.map((r) => serialize(r as Record<string, unknown>)) });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 401 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;
    const body = (await request.json()) as AutoRefillBody;

    const serviceId = String(body.service_id || "");
    const link = String(body.link || "").trim();
    const targetQuantity = Number(body.target_quantity || 0);
    const intervalHours = Number(body.interval_hours || 0);

    if (!serviceId || !link || targetQuantity <= 0 || intervalHours <= 0) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    await db.execute({
      sql: `INSERT INTO auto_refills (user_id, service_id, service_name, link, target_quantity, interval_hours, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)`,
      args: [auth.session.userId!, serviceId, String(body.service_name || ""), link, targetQuantity, intervalHours],
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 401 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id") || 0);
    if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

    await db.execute({
      sql: "DELETE FROM auto_refills WHERE id = ? AND user_id = ?",
      args: [id, auth.session.userId!],
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 401 });
  }
}