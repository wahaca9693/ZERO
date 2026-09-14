import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";

type Params = { params: Promise<{ slug: string }> };

const FIXED_API_ENDPOINT = "https://www.follower4.zone.id/api/v2";

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    const result = await db.execute({
      sql: "SELECT api_key, owner_user_id, is_active FROM branch_providers WHERE site_id = ? LIMIT 1",
      args: [siteId],
    });
    const row = result.rows[0] as unknown as Record<string, unknown> | undefined;

    return NextResponse.json({
      has_key: !!row,
      api_key: row?.api_key ? String(row.api_key).slice(0, 8) + "***" : "",
      owner_user_id: row?.owner_user_id ? Number(row.owner_user_id) : null,
      is_active: row?.is_active ? Number(row.is_active) : 0,
      api_endpoint: FIXED_API_ENDPOINT,
    });
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
    const { api_key, owner_user_id } = body as { api_key?: string; owner_user_id?: number };

    if (!api_key || !api_key.trim()) {
      return NextResponse.json({ error: "مفتاح API مطلوب" }, { status: 400 });
    }
    if (!owner_user_id || owner_user_id <= 0) {
      return NextResponse.json({ error: "معرف المستخدم الرسمي مطلوب" }, { status: 400 });
    }

    // Validate the key works by making a test call
    const testRes = await fetch(`${FIXED_API_ENDPOINT}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: api_key.trim(), action: "services" }),
    });
    const testData = await testRes.json().catch(() => null);
    if (!testRes.ok || !testData || Array.isArray(testData) === false) {
      return NextResponse.json({ error: "مفتاح API غير صالح أو لا يعمل" }, { status: 400 });
    }

    // Upsert branch provider
    const existing = await db.execute({
      sql: "SELECT id FROM branch_providers WHERE site_id = ? LIMIT 1",
      args: [siteId],
    });
    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE branch_providers SET api_key = ?, owner_user_id = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE site_id = ?",
        args: [api_key.trim(), owner_user_id, siteId],
      });
    } else {
      await db.execute({
        sql: "INSERT INTO branch_providers (site_id, api_key, owner_user_id) VALUES (?, ?, ?)",
        args: [siteId, api_key.trim(), owner_user_id],
      });
    }

    return NextResponse.json({ success: true, message: "تم حفظ مفتاح API بنجاح" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
