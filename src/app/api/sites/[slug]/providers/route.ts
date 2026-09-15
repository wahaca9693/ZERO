import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";
import { resolveApiKey } from "@/lib/api-key-cache";

type Params = { params: Promise<{ slug: string }> };

const DEFAULT_ENDPOINT = "https://www.follower4.zone.id/api/v2";

type ProviderRow = {
  id: number;
  site_id: number;
  name: string;
  api_endpoint: string;
  api_key: string;
  owner_user_id: number;
  is_active: number;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    // If provider_id is specified, return services for that provider
    const url = new URL(_request.url);
    const providerId = Number(url.searchParams.get("provider_id") || 0);
    if (providerId > 0) {
      const svc = await db.execute({
        sql: "SELECT id, remote_service_id, name, rate, category, is_hidden FROM branch_provider_services WHERE provider_id = ? ORDER BY category, name",
        args: [providerId],
      });
      return NextResponse.json({
        services: (svc.rows as unknown as Array<Record<string, unknown>>).map((s) => ({
          id: Number(s.id),
          remote_service_id: String(s.remote_service_id),
          name: String(s.name),
          rate: Number(s.rate),
          category: String(s.category),
          is_hidden: Number(s.is_hidden),
        })),
      });
    }

    const result = await db.execute({
      sql: "SELECT id, site_id, name, api_endpoint, api_key, owner_user_id, is_active FROM branch_providers WHERE site_id = ? ORDER BY id",
      args: [siteId],
    });
    const providers = (result.rows as unknown as ProviderRow[]).map((p) => ({
      id: p.id,
      name: p.name,
      api_endpoint: p.api_endpoint,
      api_key: p.api_key ? String(p.api_key).slice(0, 8) + "***" : "",
      owner_user_id: p.owner_user_id,
      is_active: Number(p.is_active),
    }));

    // Include masked key display and endpoint for the main provider
    const providerCount = providers.length;
    return NextResponse.json({ providers, count: providerCount });
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
    const { name, api_endpoint, api_key, action, provider_id, service_id, hidden } = body as {
      name?: string;
      api_endpoint?: string;
      api_key?: string;
      action?: string;
      provider_id?: number;
      service_id?: string;
      hidden?: boolean;
    };

    // Action: toggle provider on/off
    if (action === "toggle" && provider_id) {
      const prov = await db.execute({
        sql: "SELECT is_active FROM branch_providers WHERE id = ? AND site_id = ?",
        args: [provider_id, siteId],
      });
      if (!prov.rows[0]) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
      const newState = Number((prov.rows[0] as unknown as { is_active: number }).is_active) === 1 ? 0 : 1;
      await db.execute({
        sql: "UPDATE branch_providers SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [newState, provider_id],
      });
      return NextResponse.json({ success: true, is_active: newState });
    }

    // Action: delete provider
    if (action === "delete" && provider_id) {
      await db.execute({
        sql: "DELETE FROM branch_providers WHERE id = ? AND site_id = ?",
        args: [provider_id, siteId],
      });
      return NextResponse.json({ success: true, message: "تم حذف المزود وخدماته" });
    }

    // Action: hide/unhide a service
    if (action === "hide" && provider_id && service_id) {
      const hiddenState = hidden ? 1 : 0;
      await db.execute({
        sql: "UPDATE branch_provider_services SET is_hidden = ? WHERE provider_id = ? AND remote_service_id = ?",
        args: [hiddenState, provider_id, service_id],
      });
      return NextResponse.json({ success: true, is_hidden: hiddenState });
    }

    // Action: refresh services from provider
    if (action === "refresh" && provider_id) {
      const prov = await db.execute({
        sql: "SELECT api_endpoint, api_key FROM branch_providers WHERE id = ? AND site_id = ?",
        args: [provider_id, siteId],
      });
      const row = prov.rows[0] as unknown as { api_endpoint: string; api_key: string } | undefined;
      if (!row) return NextResponse.json({ error: "المزود غير موجود" }, { status: 404 });
      await syncProviderServices(Number(provider_id), row.api_endpoint, row.api_key);
      return NextResponse.json({ success: true, message: "تم تحديث الخدمات" });
    }

    // Default: add a new provider
    if (!name || !api_key) {
      return NextResponse.json({ error: "اسم المزود والمفتاح مطلوبان" }, { status: 400 });
    }

    // Validate the API key via official resolver
    const resolved = await resolveApiKey(api_key.trim());
    if (!resolved) {
      return NextResponse.json({ error: "مفتاح API غير صالح أو غير نشط", connected: false }, { status: 400 });
    }

    const endpoint = (api_endpoint || DEFAULT_ENDPOINT).trim();
    const insert = await db.execute({
      sql: "INSERT INTO branch_providers (site_id, name, api_endpoint, api_key, owner_user_id) VALUES (?, ?, ?, ?, ?)",
      args: [siteId, name.trim(), endpoint, api_key.trim(), resolved.userId],
    });
    const providerId = Number(insert.lastInsertRowid);

    // Immediately sync services
    await syncProviderServices(providerId, endpoint, api_key.trim());

    return NextResponse.json({
      success: true,
      connected: true,
      provider_id: providerId,
      message: "تم ربط المزود وجلب خدماته بنجاح",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message, connected: false }, { status: 500 });
  }
}

async function syncProviderServices(providerId: number, apiEndpoint: string, apiKey: string): Promise<number> {
  const url = new URL(apiEndpoint);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("action", "services");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (Linux; Android 13)" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);

  const rawList = Array.isArray(data) ? data : (data as Record<string, unknown>)?.services;
  const servicesList = Array.isArray(rawList) ? (rawList as Array<Record<string, unknown>>) : null;

  if (!res.ok || !servicesList) {
    throw new Error("تعذر جلب الخدمات من المزود");
  }

  // Upsert each service
  await db.batch(
    servicesList.map((svc) => ({
      sql: `INSERT INTO branch_provider_services (provider_id, remote_service_id, name, name_ar, description, rate, min, max, category, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(provider_id, remote_service_id) DO UPDATE SET
              name = excluded.name,
              name_ar = excluded.name_ar,
              description = excluded.description,
              rate = excluded.rate,
              min = excluded.min,
              max = excluded.max,
              category = excluded.category,
              type = excluded.type,
              updated_at = CURRENT_TIMESTAMP`,
      args: [
        providerId,
        String(svc.service || svc.id || ""),
        String(svc.name || ""),
        String(svc.name_ar || svc.name || ""),
        String(svc.description || ""),
        Number(svc.rate || 0),
        Number(svc.min || 0),
        Number(svc.max || 0),
        String(svc.category || ""),
        String(svc.type || "service"),
      ],
    })),
    "write",
  );

  return servicesList.length;
}