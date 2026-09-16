import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db, initDb } from "@/lib/db";

type Params = { params: Promise<{ action?: string }> };

/**
 * إدارة المالك (Admin الرسمي) لجميع الفروع:
 * - GET  /api/admin/branches            → قائمة كل الفروع + بيانات أدمن الفرع
 * - POST /api/admin/branches            → إيقاف/فتح فرع ({ action: "suspend"|"resume", slug, reason })
 */
export async function GET() {
  try {
    await requireAdmin();
    await initDb();
    const result = await db.execute(`
      SELECT s.id, s.slug, s.display_name, s.status, s.subscription_status,
             s.subscription_price, s.owner_user_id, s.created_at, s.updated_at,
             a.username AS admin_username, a.email AS admin_email,
             a.password_hash IS NOT NULL AS has_password,
             u.username AS owner_username
      FROM reseller_sites s
      LEFT JOIN reseller_accounts a ON a.site_id = s.id AND a.role = 'admin'
      LEFT JOIN users u ON u.id = s.owner_user_id
      ORDER BY s.id DESC
    `);
    const branches = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: Number(r.id),
        slug: String(r.slug),
        displayName: String(r.display_name),
        status: String(r.status),
        subscriptionStatus: String(r.subscription_status),
        subscriptionPrice: Number(r.subscription_price || 0),
        adminUsername: r.admin_username ? String(r.admin_username) : null,
        adminEmail: r.admin_email ? String(r.admin_email) : null,
        hasPassword: Number(r.has_password ?? 0) === 1,
        ownerUserId: Number(r.owner_user_id),
        ownerUsername: r.owner_username ? String(r.owner_username) : null,
        createdAt: r.created_at ?? null,
        updatedAt: r.updated_at ?? null,
      };
    });
    return NextResponse.json({ branches, count: branches.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({
      error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تحميل الفروع",
    }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    await initDb();
    const body = (await request.json()) as { action?: unknown; slug?: unknown; reason?: unknown };
    const action = String(body.action || "");
    const slug = String(body.slug || "").trim().toLowerCase();

    if (!slug) return NextResponse.json({ error: "اسم الفرع مطلوب" }, { status: 400 });
    if (action !== "suspend" && action !== "resume") {
      return NextResponse.json({ error: "إجراء غير معروف. استخدم suspend أو resume" }, { status: 400 });
    }

    const site = await db.execute({ sql: "SELECT id, status FROM reseller_sites WHERE slug = ? LIMIT 1", args: [slug] });
    const siteRow = site.rows[0] as Record<string, unknown> | undefined;
    if (!siteRow) return NextResponse.json({ error: "الفرع غير موجود" }, { status: 404 });

    if (action === "suspend") {
      const reason = String(body.reason || "").trim().slice(0, 300);
      await db.execute({
        sql: "UPDATE reseller_sites SET status = 'suspended', subscription_status = 'suspended', suspended_reason = ?, suspended_at = CURRENT_TIMESTAMP WHERE slug = ?",
        args: [reason || "مخالفة شروط الاستخدام", slug],
      });
      return NextResponse.json({
        ok: true,
        message: "تم إيقاف الفرع. سيرى الزوار رسالة الإيقاف.",
        reason,
        status: "suspended",
      });
    }

    // resume
    await db.execute({
      sql: "UPDATE reseller_sites SET status = 'active', subscription_status = 'active', suspended_reason = NULL, suspended_at = NULL WHERE slug = ?",
      args: [slug],
    });
    return NextResponse.json({ ok: true, message: "تم فتح الفرع وعاد للعمل بشكل طبيعي", status: "active" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized" ? 401 : (message === "Forbidden" || message.includes("2FA")) ? 403 : 500;
    return NextResponse.json({
      error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر تنفيذ العملية",
    }, { status });
  }
}