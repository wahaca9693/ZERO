import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, initDb } from "@/lib/db";
import { isSubscriptionExpired, publicSiteUrl } from "@/lib/reseller-sites";

type SiteRow = Record<string, unknown>;

type CreateBody = {
  action?: unknown;
  slug?: unknown;
  display_name?: unknown;
  creation_key?: unknown;
};

function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function normalizeSlug(value: unknown): string { return text(value).toLowerCase().replace(/\s+/g, "-"); }
function validSlug(value: string): boolean { return /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/.test(value); }
function parseJson<T>(value: unknown, fallback: T): T { if (typeof value !== "string") return fallback; try { return JSON.parse(value) as T; } catch { return fallback; } }

function publicSettings(row: SiteRow | undefined) {
  return {
    enabled: Number(row?.enabled ?? 1) === 1,
    monthlyPrice: Number(row?.monthly_price ?? 2),
    currency: String(row?.currency || "USD"),
    title: String(row?.title || "أنشئ موقعك الخاص"),
    description: String(row?.description || "احصل على لوحة خدمات خاصة بك وابدأ بيع الخدمات وكسب العمولة."),
    features: parseJson<string[]>(row?.features_json, []),
    terms: parseJson<string[]>(row?.terms_json, []),
    faq: parseJson<Array<{ q: string; a: string }>>(row?.faq_json, []),
    primaryColor: String(row?.primary_color || "#f97316"),
    secondaryColor: String(row?.secondary_color || "#fbbf24"),
  };
}

function publicSite(row: SiteRow, origin: string) {
  const expired = isSubscriptionExpired(row.next_billing_at);
  return {
    id: Number(row.id),
    slug: String(row.slug),
    displayName: String(row.display_name),
    status: expired ? "expired" : String(row.status),
    subscriptionStatus: expired ? "expired" : String(row.subscription_status),
    subscriptionPrice: Number(row.subscription_price || 0),
    subscriptionCurrency: String(row.subscription_currency || "USD"),
    nextBillingAt: row.next_billing_at ?? null,
    publicUrl: publicSiteUrl(origin, String(row.slug)),
    createdAt: row.created_at ?? null,
    providerAccessEnabled: Number(row.provider_access_enabled ?? 0) === 1,
  };
}

async function loadForUser(userId: number, origin: string) {
  const [settingsResult, sitesResult] = await Promise.all([
    db.execute("SELECT * FROM reseller_settings WHERE id = 1 LIMIT 1"),
    db.execute({ sql: "SELECT id, slug, display_name, status, subscription_status, subscription_price, subscription_currency, next_billing_at, created_at, provider_access_enabled FROM reseller_sites WHERE owner_user_id = ? ORDER BY id DESC", args: [userId] }),
  ]);
      return { settings: publicSettings(settingsResult.rows[0] as SiteRow | undefined), sites: sitesResult.rows.map((row) => publicSite(row as SiteRow, origin)) };

}

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    await initDb();
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    if (action === "check-name") {
      const slug = normalizeSlug(url.searchParams.get("slug"));
      if (!validSlug(slug)) return NextResponse.json({ available: false, error: "استخدم 3 إلى 32 حرفًا إنجليزيًا صغيرًا أو رقمًا، مع شرطة اختيارية بينهما." }, { status: 400 });
      const result = await db.execute({ sql: "SELECT id FROM reseller_sites WHERE slug = ? LIMIT 1", args: [slug] });
      return NextResponse.json({ available: result.rows.length === 0, slug });
    }
    return NextResponse.json(await loadForUser(session.userId!, new URL(request.url).origin));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر تحميل المواقع";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    await initDb();
    const body = (await request.json()) as CreateBody;
    const action = text(body.action) || "create";
    if (action !== "create") return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
    const slug = normalizeSlug(body.slug);
    const displayName = text(body.display_name) || slug;
    const creationKey = text(body.creation_key) || text(request.headers.get("Idempotency-Key"));
    if (!validSlug(slug)) return NextResponse.json({ error: "اسم الفرع غير صالح. استخدم 3 إلى 32 حرفًا إنجليزيًا صغيرًا أو رقمًا." }, { status: 400 });
    if (displayName.length < 2 || displayName.length > 100) return NextResponse.json({ error: "اسم الموقع غير صالح" }, { status: 400 });
    if (!/^[A-Za-z0-9:_-]{16,128}$/.test(creationKey)) return NextResponse.json({ error: "مفتاح الإنشاء غير صالح" }, { status: 400 });

    const settingsResult = await db.execute("SELECT * FROM reseller_settings WHERE id = 1 LIMIT 1");
    const settingsRow = settingsResult.rows[0] as SiteRow | undefined;
    const settings = publicSettings(settingsRow);
    if (!settings.enabled) return NextResponse.json({ error: "إنشاء المواقع متوقف مؤقتًا من الإدارة" }, { status: 403 });
    const price = Number(settings.monthlyPrice);
    if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "سعر الاشتراك غير صالح" }, { status: 500 });

    const existingByKey = await db.execute({ sql: "SELECT * FROM reseller_sites WHERE creation_key = ? AND owner_user_id = ? LIMIT 1", args: [creationKey, session.userId!] });
    if (existingByKey.rows.length) return NextResponse.json({ ok: true, site: publicSite(existingByKey.rows[0] as SiteRow, new URL(request.url).origin), alreadyCreated: true, dashboardUrl: `/site-management?site=${encodeURIComponent(slug)}` });

    const transaction = await db.transaction("write");
    try {
      const duplicate = await transaction.execute({ sql: "SELECT id FROM reseller_sites WHERE slug = ? LIMIT 1", args: [slug] });
      if (duplicate.rows.length) {
        await transaction.rollback();
        return NextResponse.json({ error: "اسم الفرع مستخدم مسبقًا، اختر اسمًا آخر" }, { status: 409 });
      }
      const debit = await transaction.execute({ sql: "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?", args: [price, session.userId!, price] });
      if (Number(debit.rowsAffected || 0) !== 1) {
        await transaction.rollback();
        return NextResponse.json({ error: `رصيدك غير كافٍ للاشتراك الشهري (${price.toFixed(2)} ${settings.currency})` }, { status: 409 });
      }
      const inserted = await transaction.execute({
        sql: `INSERT INTO reseller_sites (owner_user_id, creation_key, slug, display_name, subscription_price, subscription_currency, next_billing_at, theme_json) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+1 month'), ?)`,
        args: [session.userId!, creationKey, slug, displayName, price, settings.currency, JSON.stringify({ primaryColor: settings.primaryColor, secondaryColor: settings.secondaryColor })],
      });
      const siteId = Number(inserted.lastInsertRowid);
      await transaction.execute({ sql: "INSERT INTO reseller_site_users (site_id, user_id, role) VALUES (?, ?, 'owner')", args: [siteId, session.userId!] });
      await transaction.execute({ sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'reseller_subscription', ?, 'completed', ?, 'wallet')", args: [session.userId!, -price, `اشتراك موقع فرعي: ${displayName}`] });
      await transaction.commit();
      const created = await db.execute({ sql: "SELECT id, slug, display_name, status, subscription_status, subscription_price, subscription_currency, next_billing_at, created_at, provider_access_enabled FROM reseller_sites WHERE id = ?", args: [siteId] });
      return NextResponse.json({ ok: true, site: publicSite(created.rows[0] as SiteRow, new URL(request.url).origin), dashboardUrl: `/site-management?site=${encodeURIComponent(slug)}`, publicUrl: publicSiteUrl(new URL(request.url).origin, slug), charged: price, currency: settings.currency });
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر إنشاء الموقع";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : "تعذر إنشاء الموقع" }, { status });
  }
}
