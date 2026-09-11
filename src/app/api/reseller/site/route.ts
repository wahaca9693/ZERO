import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, initDb } from "@/lib/db";
import { isSubscriptionExpired, publicSiteUrl } from "@/lib/reseller-sites";

type Row = Record<string, unknown>;
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function jsonValue<T>(value: unknown, fallback: T): T { if (typeof value !== "string") return fallback; try { return JSON.parse(value) as T; } catch { return fallback; } }
function sitePayload(row: Row, customers: number, origin: string) { const expired = isSubscriptionExpired(row.next_billing_at); return { id: Number(row.id), slug: String(row.slug), displayName: String(row.display_name), status: expired ? "expired" : String(row.status), subscriptionStatus: expired ? "expired" : String(row.subscription_status), subscriptionPrice: Number(row.subscription_price || 0), subscriptionCurrency: String(row.subscription_currency || "USD"), nextBillingAt: row.next_billing_at ?? null, publicUrl: publicSiteUrl(origin, String(row.slug)), theme: jsonValue(row.theme_json, {}), paymentMethods: jsonValue(row.payment_methods_json, []), providerAccessEnabled: Number(row.provider_access_enabled ?? 0) === 1, customers }; }

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    await initDb();
    const slug = text(new URL(request.url).searchParams.get("slug"));
    if (!slug) return NextResponse.json({ error: "اسم الموقع مطلوب" }, { status: 400 });
    const result = await db.execute({ sql: "SELECT * FROM reseller_sites WHERE slug = ? AND owner_user_id = ? LIMIT 1", args: [slug, session.userId!] });
    const row = result.rows[0] as Row | undefined;
    if (!row) return NextResponse.json({ error: "الموقع غير موجود أو لا تملك صلاحية الوصول إليه" }, { status: 404 });
    const count = await db.execute({ sql: "SELECT COUNT(*) AS count FROM reseller_site_users WHERE site_id = ? AND role = 'customer'", args: [Number(row.id)] });
    return NextResponse.json({ site: sitePayload(row, Number((count.rows[0] as Row | undefined)?.count || 0), new URL(request.url).origin) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر تحميل لوحة الموقع";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    await initDb();
    const body = (await request.json()) as { slug?: unknown; theme?: unknown; paymentMethods?: unknown };
    const slug = text(body.slug);
    if (!slug) return NextResponse.json({ error: "اسم الموقع مطلوب" }, { status: 400 });
    const theme = body.theme && typeof body.theme === "object" && !Array.isArray(body.theme) ? body.theme : {};
    const paymentMethods = Array.isArray(body.paymentMethods) ? body.paymentMethods.slice(0, 12).map((method) => ({ name: text((method as Row)?.name), instructions: text((method as Row)?.instructions), enabled: Boolean((method as Row)?.enabled) })).filter((method) => method.name.length >= 2 && method.name.length <= 80) : [];
    const current = await db.execute({ sql: "SELECT next_billing_at, status FROM reseller_sites WHERE slug = ? AND owner_user_id = ? LIMIT 1", args: [slug, session.userId!] });
    const currentRow = current.rows[0] as Row | undefined;
    if (!currentRow) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    if (isSubscriptionExpired(currentRow.next_billing_at)) return NextResponse.json({ error: "انتهى الاشتراك؛ جدّد الموقع أولًا لإجراء التعديلات" }, { status: 402 });
    const result = await db.execute({ sql: "UPDATE reseller_sites SET theme_json = ?, payment_methods_json = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ? AND owner_user_id = ? AND status = 'active'", args: [JSON.stringify(theme), JSON.stringify(paymentMethods), slug, session.userId!] });
    if (Number(result.rowsAffected || 0) !== 1) return NextResponse.json({ error: "الموقع غير موجود أو غير نشط" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر حفظ إعدادات الموقع";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : message }, { status });
  }
}
