import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";

type Params = { params: Promise<{ slug: string }> };

type PaymentMethod = { name: string; instructions: string; enabled: boolean };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    const result = await db.execute({
      sql: "SELECT theme_json, payment_methods_json, provider_access_enabled FROM reseller_sites WHERE id = ? LIMIT 1",
      args: [siteId],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });

    const theme = JSON.parse(String(row.theme_json || "{}"));
    const paymentMethods = JSON.parse(String(row.payment_methods_json || "[]"));

    return NextResponse.json({
      theme,
      paymentMethods,
      providerAccessEnabled: Number(row.provider_access_enabled) === 1,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    const body = await request.json();
    const { theme, paymentMethods, providerAccessEnabled } = body as {
      theme?: Record<string, unknown>;
      paymentMethods?: PaymentMethod[];
      providerAccessEnabled?: boolean;
    };

    if (paymentMethods !== undefined && !Array.isArray(paymentMethods)) {
      return NextResponse.json({ error: "paymentMethods يجب أن يكون مصفوفة" }, { status: 400 });
    }

    const current = await db.execute({
      sql: "SELECT theme_json, payment_methods_json FROM reseller_sites WHERE id = ? LIMIT 1",
      args: [siteId],
    });
    const row = current.rows[0] as Record<string, unknown> | undefined;
    if (!row) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });

    const mergedTheme = { ...JSON.parse(String(row.theme_json || "{}")), ...(theme || {}) };
    const mergedMethods = paymentMethods ?? JSON.parse(String(row.payment_methods_json || "[]"));

    // Validate each method
    for (const m of mergedMethods) {
      if (!m || typeof m.name !== "string" || !m.name.trim()) {
        return NextResponse.json({ error: "كل طريقة دفع يجب أن تحتوي على اسم" }, { status: 400 });
      }
    }

    await db.execute({
      sql: "UPDATE reseller_sites SET theme_json = ?, payment_methods_json = ?, provider_access_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [JSON.stringify(mergedTheme), JSON.stringify(mergedMethods), providerAccessEnabled === true ? 1 : 0, siteId],
    });

    // Audit: record the change
    await db.execute({
      sql: "INSERT INTO reseller_transactions (site_id, account_id, type, amount, status, description) VALUES (?, ?, 'settings', 0, 'completed', ?)",
      args: [siteId, auth.account.id, "تحديث إعدادات الموقع وطرق الدفع من الأدمن"],
    });

    return NextResponse.json({ success: true, theme: mergedTheme, paymentMethods: mergedMethods });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500 });
  }
}