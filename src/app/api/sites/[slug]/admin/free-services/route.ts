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
      sql: "SELECT id, service_id, service_name, platform, link, quantity, description, enabled FROM reseller_free_services WHERE site_id = ? ORDER BY id DESC LIMIT 100",
      args: [siteId],
    });
    const services = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id), serviceId: r.service_id ? String(r.service_id) : "",
        serviceName: r.service_name ? String(r.service_name) : "", platform: r.platform ? String(r.platform) : "",
        link: r.link ? String(r.link) : "", quantity: Number(r.quantity || 0),
        description: r.description ? String(r.description) : "", enabled: Number(r.enabled || 0) === 1,
      };
    });
    return NextResponse.json({ services });
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
    const { serviceId, serviceName, platform, link, quantity, description, enabled, id, action } = body as {
      serviceId?: string; serviceName?: string; platform?: string; link?: string; quantity?: number;
      description?: string; enabled?: boolean; id?: number; action?: "delete" | "toggle" | "create";
    };

    if (action === "delete" && id) {
      await db.execute({ sql: "DELETE FROM reseller_free_services WHERE id = ? AND site_id = ?", args: [id, siteId] });
      return NextResponse.json({ success: true });
    }
    if (action === "toggle" && id) {
      await db.execute({
        sql: "UPDATE reseller_free_services SET enabled = CASE enabled WHEN 1 THEN 0 ELSE 1 END WHERE id = ? AND site_id = ?",
        args: [id, siteId],
      });
      return NextResponse.json({ success: true });
    }
    if (!serviceId || !serviceName) return NextResponse.json({ error: "serviceId و serviceName مطلوبان" }, { status: 400 });
    await db.execute({
      sql: "INSERT INTO reseller_free_services (site_id, service_id, service_name, platform, link, quantity, description, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [siteId, serviceId, serviceName, platform || "", link || "", Number(quantity || 0), description || "", enabled === false ? 0 : 1],
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
