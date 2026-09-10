import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db, initDb } from "@/lib/db";

type FaqItem = { q: string; a: string };

type SettingsInput = {
  enabled?: unknown;
  monthly_price?: unknown;
  currency?: unknown;
  title?: unknown;
  description?: unknown;
  features?: unknown;
  terms?: unknown;
  faq?: unknown;
  primary_color?: unknown;
  secondary_color?: unknown;
};

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function color(value: unknown, fallback: string): string {
  const valueText = text(value, fallback);
  return /^#[0-9a-f]{6}$/i.test(valueText) ? valueText : fallback;
}

function list(value: unknown, fallback: string[], max = 12): string[] {
  const source = Array.isArray(value) ? value : fallback;
  return source
    .map((item) => text(item))
    .filter((item) => item.length >= 2 && item.length <= 300)
    .slice(0, max);
}

function faq(value: unknown, fallback: FaqItem[]): FaqItem[] {
  const source = Array.isArray(value) ? value : fallback;
  return source
    .map((item) => ({ q: text((item as FaqItem)?.q), a: text((item as FaqItem)?.a) }))
    .filter((item) => item.q.length >= 2 && item.q.length <= 180 && item.a.length >= 2 && item.a.length <= 600)
    .slice(0, 12);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function safeSettings(row: Record<string, unknown> | undefined) {
  const features = parseJson<string[]>(row?.features_json, []);
  const terms = parseJson<string[]>(row?.terms_json, []);
  const faqItems = parseJson<FaqItem[]>(row?.faq_json, []);
  return {
    enabled: Number(row?.enabled ?? 1) === 1,
    monthlyPrice: Number(row?.monthly_price ?? 2),
    currency: text(row?.currency, "USD"),
    title: text(row?.title, "أنشئ موقعك الخاص"),
    description: text(row?.description, "احصل على لوحة خدمات خاصة بك وابدأ بيع الخدمات وكسب العمولة."),
    features,
    terms,
    faq: faqItems,
    primaryColor: color(row?.primary_color, "#f97316"),
    secondaryColor: color(row?.secondary_color, "#fbbf24"),
    updatedAt: row?.updated_at ?? null,
  };
}

async function readSettings() {
  await initDb();
  const result = await db.execute("SELECT * FROM reseller_settings WHERE id = 1 LIMIT 1");
  return safeSettings(result.rows[0] as Record<string, unknown> | undefined);
}

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ settings: await readSettings() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تحميل إعدادات المواقع" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as SettingsInput;
    const current = await readSettings();
    const monthlyPrice = body.monthly_price === undefined ? current.monthlyPrice : Number(body.monthly_price);
    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0 || monthlyPrice > 100000) {
      return NextResponse.json({ error: "السعر الشهري غير صالح" }, { status: 400 });
    }
    const currency = text(body.currency, current.currency).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "العملة غير صالحة" }, { status: 400 });
    const title = text(body.title, current.title);
    const description = text(body.description, current.description);
    if (title.length < 2 || title.length > 120 || description.length < 2 || description.length > 500) {
      return NextResponse.json({ error: "العنوان أو الوصف غير صالح" }, { status: 400 });
    }
    const features = body.features === undefined ? current.features : list(body.features, current.features);
    const terms = body.terms === undefined ? current.terms : list(body.terms, current.terms);
    const faqItems = body.faq === undefined ? current.faq : faq(body.faq, current.faq);
    if (!features.length || !terms.length || !faqItems.length) return NextResponse.json({ error: "يجب إضافة ميزة وشروط وسؤال شائع واحد على الأقل" }, { status: 400 });
    const primaryColor = color(body.primary_color, current.primaryColor);
    const secondaryColor = color(body.secondary_color, current.secondaryColor);
    await db.execute({
      sql: `UPDATE reseller_settings SET enabled=?, monthly_price=?, currency=?, title=?, description=?, features_json=?, terms_json=?, faq_json=?, primary_color=?, secondary_color=?, updated_at=CURRENT_TIMESTAMP WHERE id=1`,
      args: [body.enabled === undefined ? (current.enabled ? 1 : 0) : (body.enabled === true || body.enabled === 1 || body.enabled === "1" ? 1 : 0), monthlyPrice, currency, title, description, JSON.stringify(features), JSON.stringify(terms), JSON.stringify(faqItems), primaryColor, secondaryColor],
    });
    return NextResponse.json({ ok: true, settings: await readSettings() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر حفظ إعدادات المواقع" }, { status });
  }
}
