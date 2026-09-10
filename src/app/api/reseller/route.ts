import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, initDb } from "@/lib/db";

type ResellerRequestBody = {
  site_name?: unknown;
  contact?: unknown;
  notes?: unknown;
};

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function publicSettings(row: Record<string, unknown> | undefined) {
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

export async function GET() {
  try {
    const session = await requireAuth();
    await initDb();
    const [settingsResult, requestsResult] = await Promise.all([
      db.execute("SELECT * FROM reseller_settings WHERE id = 1 LIMIT 1"),
      db.execute({ sql: "SELECT id, site_name, status, created_at FROM reseller_requests WHERE user_id = ? ORDER BY id DESC LIMIT 20", args: [session.userId!] }),
    ]);
    return NextResponse.json({
      settings: publicSettings(settingsResult.rows[0] as Record<string, unknown> | undefined),
      requests: requestsResult.rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر تحميل صفحة المواقع";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    await initDb();
    const body: ResellerRequestBody = await request.json();
    const site_name = stringValue(body.site_name);
    const contact = stringValue(body.contact);
    const notes = stringValue(body.notes);
    if (site_name.length < 2 || site_name.length > 80 || !contact || contact.length > 180) {
      return NextResponse.json({ error: "أدخل اسم الموقع وطريقة تواصل صحيحة" }, { status: 400 });
    }
    const settingsResult = await db.execute("SELECT enabled FROM reseller_settings WHERE id = 1 LIMIT 1");
    if (Number((settingsResult.rows[0] as Record<string, unknown> | undefined)?.enabled ?? 1) !== 1) {
      return NextResponse.json({ error: "إنشاء المواقع متوقف مؤقتًا من الإدارة" }, { status: 403 });
    }
    const result = await db.execute({
      sql: `INSERT INTO reseller_requests (user_id, site_name, contact, notes) VALUES (?, ?, ?, ?) RETURNING id, site_name, contact, notes, status, created_at`,
      args: [session.userId!, site_name, contact, notes],
    });
    return NextResponse.json({ request: result.rows[0], message: "تم استلام طلبك. سيتم تفعيل الإنشاء الفعلي بعد اعتماد إعدادات الموقع." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر إرسال الطلب";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : message }, { status });
  }
}
