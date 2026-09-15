import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import { requireSiteAuth } from "@/lib/session";
import { findCatalogService, findCatalogServiceByPublicId } from "@/lib/service-catalog";
import { normalizeServiceLimits } from "@/lib/service-limits";

const FIXED_API_ENDPOINT = "https://www.follower4.zone.id/api/v2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JsonRecord = Record<string, unknown>;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store, max-age=0", ...(init?.headers || {}) },
  });
}

/**
 * POST /api/sites/{slug}/orders/create
 * Mirror of the main platform order creation, using branch's API key and official wallet.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;
    const accountId = auth.session.userId!;

    const body = await request.json().catch(() => ({}));
    const serviceId = String(body?.serviceId ?? body?.service_id ?? "").trim();
    const link = String(body?.link ?? "").trim();
    const quantity = body?.quantity;

    if (!serviceId || !link || quantity === undefined || quantity === null || quantity === "") {
      return json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }
    if (serviceId.length > 128) return json({ error: "معرّف الخدمة غير صالح" }, { status: 400 });
    if (link.length > 2048) return json({ error: "الرابط طويل جدًا" }, { status: 400 });

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) return json({ error: "الكمية يجب أن تكون رقمًا صحيحًا موجبًا" }, { status: 400 });

    const rawIdempotencyKey = request.headers.get("Idempotency-Key") || (typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "");
    const idempotencyKey = rawIdempotencyKey.trim();
    if (idempotencyKey && (idempotencyKey.length < 16 || idempotencyKey.length > 128)) {
      return json({ error: "مفتاح Idempotency-Key يجب أن يكون بين 16 و128 حرفًا" }, { status: 400 });
    }
    if (idempotencyKey) {
      const existingResult = await db.execute({
        sql: `SELECT id, smmnine_order_id, service_name, charge, status, link, quantity
              FROM reseller_orders WHERE account_id = ? AND idempotency_key = ? LIMIT 1`,
        args: [accountId, idempotencyKey],
      });
      const existing = existingResult.rows[0] as unknown as JsonRecord | undefined;
      if (existing) {
        return json({
          replayed: true,
          order: {
            id: Number(existing.id),
            smmnine_order_id: existing.smmnine_order_id ?? null,
            service_name: existing.service_name,
            charge: Number(existing.charge),
            status: existing.status,
            link: existing.link,
            quantity: Number(existing.quantity),
          },
        });
      }
    }

    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return json({ error: "الموقع غير موجود" }, { status: 404 });
    const siteId = Number(loaded.site.id);

    // Get branch provider API key
    const providerResult = await db.execute({
      sql: "SELECT api_key, owner_user_id FROM branch_providers WHERE site_id = ? AND is_active = 1 LIMIT 1",
      args: [siteId],
    });
    const providerRow = providerResult.rows[0] as unknown as Record<string, unknown> | undefined;
    const apiKey = providerRow?.api_key ? String(providerRow.api_key) : null;
    const ownerUserId = providerRow?.owner_user_id ? Number(providerRow.owner_user_id) : 0;

    if (!apiKey) {
      return json({ error: "لم يتم ربط مفتاح API للمنصة بعد — اذهب لإعدادات المزود" }, { status: 400 });
    }

    const requestedServiceId = String(serviceId);
    const catalogService = requestedServiceId.startsWith("svc_")
      ? await findCatalogServiceByPublicId(requestedServiceId)
      : await findCatalogService(requestedServiceId);

    if (!catalogService) {
      return json({ error: "هذه الخدمة غير متاحة في هذا الموقع." }, { status: 400 });
    }

    const providerService = {
      id: catalogService.providerServiceId,
      remote_service_id: catalogService.remoteServiceId,
      name: catalogService.name,
      min: catalogService.min,
      max: catalogService.max,
      sell_rate: catalogService.rate,
      rate: catalogService.rate,
      provider_id: catalogService.providerId,
      markup_percent: 0,
    };

    const limits = normalizeServiceLimits(providerService.min, providerService.max);
    if (!limits) return json({ error: "حدود هذه الخدمة غير صالحة حاليًا لدى المزود" }, { status: 409 });
    const { min, max } = limits;
    if (qty < min || qty > max) return json({ error: `الكمية يجب أن تكون بين ${min} و ${max}` }, { status: 400 });

    const sellRate = providerService.sell_rate != null ? Number(providerService.sell_rate) : Number(providerService.rate);
    const cost = (sellRate * qty) / 1000;
    if (!Number.isFinite(cost) || cost < 0) return json({ error: "سعر الخدمة غير صالح" }, { status: 500 });

    // Deduct from official wallet (owner)
    if (ownerUserId <= 0) return json({ error: "لا يوجد مالك رسمي مرتبط" }, { status: 400 });
    const ownerDebit = await db.execute({
      sql: "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
      args: [cost, ownerUserId, cost],
    });
    if (Number(ownerDebit.rowsAffected || 0) !== 1) {
      return json({ error: "رصيد المالك الرسمي غير كافٍ" }, { status: 409 });
    }

    // Record branch order
    let localOrderId: number | null = null;
    try {
      const orderResult = await db.execute({
        sql: `INSERT INTO reseller_orders (site_id, account_id, service_id, service_name, link, quantity, charge, status, provider_id, idempotency_key)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?)`,
        args: [siteId, accountId, Number(providerService.id), String(providerService.name), String(link), qty, cost, Number(providerService.provider_id), idempotencyKey || null],
      });
      localOrderId = Number(orderResult.lastInsertRowid);

      await db.execute({
        sql: "INSERT INTO provider_order_logs (local_order_id, provider_id, remote_order_id, status) VALUES (?, ?, NULL, 'pending')",
        args: [localOrderId, Number(providerService.provider_id)],
      });
    } catch (error) {
      await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [cost, ownerUserId] });
      throw error;
    }

    // Execute order via FIXED_API_ENDPOINT using branch's API key (GET with key in query)
    const providerApiUrl = "https://www.follower4.zone.id/api/v2";
    const branchKeyRow = await db.execute({ sql: "SELECT api_key FROM branch_providers WHERE site_id = ? LIMIT 1", args: [siteId] });
    const branchKey = String(branchKeyRow.rows[0]?.api_key || "");
    const orderUrl = new URL(providerApiUrl);
    orderUrl.searchParams.set("key", branchKey);
    orderUrl.searchParams.set("action", "add");
    orderUrl.searchParams.set("service", String(providerService.remote_service_id));
    orderUrl.searchParams.set("link", String(link));
    orderUrl.searchParams.set("quantity", String(qty));

    const providerRes = await fetch(orderUrl.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });
    const providerData = await providerRes.json().catch(() => null);

    if (!providerRes.ok || !providerData) {
      await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [cost, ownerUserId] });
      await db.execute({ sql: "UPDATE reseller_orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [localOrderId] });
      return json({ error: `فشل إنشاء الطلب لدى المزود` }, { status: 502 });
    }

    const remoteOrderId = String(providerData.order || providerData.order_id || providerData.id || "");
    if (!remoteOrderId) {
      await db.execute({ sql: "UPDATE users SET balance = balance + ? WHERE id = ?", args: [cost, ownerUserId] });
      await db.execute({ sql: "UPDATE reseller_orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [localOrderId] });
      return json({ error: "فشل إنشاء الطلب: لم يتم إرجاع رقم الطلب" }, { status: 502 });
    }

    await db.execute({
      sql: "UPDATE reseller_orders SET smmnine_order_id = ?, status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [remoteOrderId, localOrderId],
    });
    await db.execute({
      sql: "UPDATE provider_order_logs SET remote_order_id = ?, status = 'submitted' WHERE local_order_id = ?",
      args: [remoteOrderId, localOrderId],
    });

    await db.execute({
      sql: `INSERT INTO reseller_transactions (site_id, account_id, type, amount, status, description)
            VALUES (?, ?, 'order', ?, 'completed', ?)`,
      args: [siteId, accountId, cost, `طلب #${localOrderId} — ${String(providerService.name)}`],
    });

    return json({
      success: true,
      order: {
        id: localOrderId,
        smmnine_order_id: remoteOrderId,
        service_name: providerService.name,
        link,
        quantity: qty,
        charge: cost,
        status: "processing",
      },
    });
  } catch (error) {
    console.error("[site-order-create]", error);
    return json({ error: "تعذر إنشاء الطلب" }, { status: 500 });
  }
}
