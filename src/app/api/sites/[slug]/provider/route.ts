import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";
import { resolveApiKey } from "@/lib/api-key-cache";

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
    const { api_key } = body as { api_key?: string };

    if (!api_key || !api_key.trim()) {
      return NextResponse.json({ error: "مفتاح API مطلوب" }, { status: 400 });
    }

    // 1. Validate the key exists and is active in the system (official security)
    const resolved = await resolveApiKey(api_key.trim());
    if (!resolved) {
      return NextResponse.json({ 
        error: "مفتاح API غير صالح أو غير نشط", 
        connected: false 
      }, { status: 400 });
    }

    // 2. Owner ID is the account associated with this API key
    const ownerUserId = resolved.userId;

    // 3. Link the key to the branch
    const existing = await db.execute({
      sql: "SELECT id FROM branch_providers WHERE site_id = ? LIMIT 1",
      args: [siteId],
    });
    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE branch_providers SET api_key = ?, owner_user_id = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE site_id = ?",
        args: [api_key.trim(), ownerUserId, siteId],
      });
    } else {
      await db.execute({
        sql: "INSERT INTO branch_providers (site_id, api_key, owner_user_id) VALUES (?, ?, ?)",
        args: [siteId, api_key.trim(), ownerUserId],
      });
    }

    return NextResponse.json({ 
      success: true, 
      connected: true,
      message: "تم ربط مفتاح API بنجاح — الخدمات مربوطة الآن" 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ 
      error: message, 
      connected: false 
    }, { status: 500 });
  }
}
