import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_SERVICE_ID = /^svc_[a-f0-9]{20}$/;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

function serviceIdFromBody(body: unknown): string {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "";
  const value = (body as Record<string, unknown>).serviceId;
  const serviceId = String(value ?? "").trim();
  return PUBLIC_SERVICE_ID.test(serviceId) ? serviceId : "";
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "Forbidden") return json({ error: "الحساب محظور" }, 403);
  if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول" }, 401);
  if (message === "2FA_REQUIRED") return json({ error: "يرجى إكمال التحقق الأمني" }, 403);
  return json({ error: "تعذر تحديث المفضلة" }, 500);
}

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await db.execute({
      sql: "SELECT service_id FROM user_favorite_services WHERE user_id = ? ORDER BY created_at DESC",
      args: [session.userId!],
    });
    return json({ favoriteServiceIds: result.rows.map((row) => String((row as Record<string, unknown>).service_id ?? "")).filter((id) => PUBLIC_SERVICE_ID.test(id)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const serviceId = serviceIdFromBody(await request.json().catch(() => ({})));
    if (!serviceId) return json({ error: "معرّف الخدمة غير صالح" }, 400);
    await db.execute({
      sql: "INSERT OR IGNORE INTO user_favorite_services (user_id, service_id) VALUES (?, ?)",
      args: [session.userId!, serviceId],
    });
    return json({ success: true, serviceId, favorite: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth();
    const serviceId = serviceIdFromBody(await request.json().catch(() => ({})));
    if (!serviceId) return json({ error: "معرّف الخدمة غير صالح" }, 400);
    await db.execute({
      sql: "DELETE FROM user_favorite_services WHERE user_id = ? AND service_id = ?",
      args: [session.userId!, serviceId],
    });
    return json({ success: true, serviceId, favorite: false });
  } catch (error) {
    return errorResponse(error);
  }
}
