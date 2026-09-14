import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import { requireSiteAuth } from "@/lib/session";
import { executeProviderOrder } from "@/lib/providers";
import { findCatalogService, findCatalogServiceByPublicId } from "@/lib/service-catalog";
import { normalizeServiceLimits } from "@/lib/service-limits";

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
 * Mirror of the main platform order creation, operating on the reseller
 * account balance and recording into reseller_orders.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(request, slug);
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

    const requestedServiceId = String(serviceId);
    const catalogService = requestedServiceId.startsWith("svc_")
      ? await findCatalogServiceByPublicId(requestedServiceId)
      : await findCatalogService(requestedServiceId);
    const providerService: JsonRecord | undefined = catalogService?.source === "provider"
      ? {
          id: catalogService.providerServiceId,
          remote_service_id: catalogService.remoteServiceId,
          name: catalogService.name,
          min: catalogService.min,
          max: catalogService.max,
          sell_rate: catalogService.rate,
          rate: catalogService.rate,
          provider_id: catalogService.providerId,
          markup_percent: 0,
        }
      : undefined;

    if (!catalogService || !providerService) {
      return json({ error: "هذه الخدمة غير متاحة في هذا الموقع." }, { status: 400 });
    }

    const limits = normalizeServiceLimits(providerService.min, providerService.max);
    if (!limits) return json({ error: "حدود هذه الخدمة غير صالحة حاليًا لدى المزود" }, { status: 409 });
    const { min, max } = limits;
    if (qty < min || qty > max) return json({ error: `الكمية يجب أن تكون بين ${min} و ${max}` }, { status: 400 });

    const sellRate = providerService.sell_rate != null ? Number(providerService.sell_rate) : Number(providerService.rate);
    const cost = (sellRate * qty) / 1000;
    if (!Number.isFinite(cost) || cost < 0) return json({ error: "سعر الخدمة غير صالح" }, { status: 500 });

    const accountResult = await db.execute({
      sql: "SELECT balance FROM reseller_accounts WHERE id = ? AND is_banned = 0 LIMIT 1",
      args: [accountId],
    });
    const balance = Number((accountResult.rows[0] as unknown as JsonRecord | undefined)?.balance || 0);
    if (balance < cost) return json({ error: "رصيد غير كافٍ" }, { status: 400 });

    const debit = await db.execute({
      sql: "UPDATE reseller_accounts SET balance = balance - ? WHERE id = ? AND balance >= ?",
      args: [cost, accountId, cost],
    });
    if (Number(debit.rowsAffected || 0) !== 1) {
      return json({ error: "رصيد غير كافٍ أو تغيّر أثناء المعالجة" }, { status: 409 });
    }

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
      await db.execute({ sql: "UPDATE reseller_accounts SET balance = balance + ? WHERE id = ?", args: [cost, accountId] });
      throw error;
    }

    const providerOrder = await executeProviderOrder({
      providerId: Number(providerService.provider_id),
      service: String(providerService.remote_service_id),
      link: String(link),
      quantity: String(qty),
    });

    if (!providerOrder.ok || !providerOrder.remoteOrderId) {
      await db.execute({ sql: "UPDATE reseller_accounts SET balance = balance + ? WHERE id = ?", args: [cost, accountId] });
      await db.execute({ sql: "UPDATE reseller_orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [localOrderId] });
      await db.execute({ sql: "UPDATE provider_order_logs SET status = 'failed', error = ? WHERE local_order_id = ?", args: [providerOrder.error || "فشل المزود", localOrderId] });
      return json({ error: `فشل إنشاء الطلب لدى المزود: ${providerOrder.error || "خطأ غير معروف"}` }, { status: 502 });
    }

    const remoteOrderId = providerOrder.remoteOrderId;
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