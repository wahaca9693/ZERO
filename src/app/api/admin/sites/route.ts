import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/sites
 * Admin-only: lists ALL reseller sites with their owners and public links.
 */
export async function GET() {
  try {
    const user = await requireAdmin();
    void user;
    await initDb();

    // جلب الفروع + أصحابها
    const result = await db.execute({
      sql: `SELECT s.id, s.slug, s.display_name, s.status, s.subscription_status,
                   s.subscription_price, s.subscription_currency, s.next_billing_at,
                   s.created_at, s.owner_user_id, s.suspended_reason, s.admin_username, s.admin_email,
                   u.username AS owner_username, u.email AS owner_email, u.balance AS owner_balance
            FROM reseller_sites s
            LEFT JOIN users u ON u.id = s.owner_user_id
            ORDER BY s.created_at DESC`,
    });

    // جلب عدّادات الفروع دفعة واحدة (الإحصائيات)
    const countersResult = await db.execute({
      sql: `SELECT ra.site_id,
                   (SELECT COUNT(*) FROM reseller_accounts ac WHERE ac.site_id = ra.site_id) AS customer_count,
                   (SELECT COUNT(*) FROM reseller_orders ro WHERE ro.site_id = ra.site_id) AS order_count
            FROM reseller_accounts ra
            GROUP BY ra.site_id`,
    });
    const counters = new Map<number, { customers: number; orders: number }>();
    for (const row of countersResult.rows) {
      const r = row as Record<string, unknown>;
      counters.set(Number(r.site_id), {
        customers: Number(r.customer_count || 0),
        orders: Number(r.order_count || 0),
      });
    }

    // جلب معلومات أدمن الفرع من reseller_accounts (role='admin')
    const adminResult = await db.execute({
      sql: `SELECT site_id, username, email, (password_hash IS NOT NULL) AS has_password
            FROM reseller_accounts
            WHERE role = 'admin'
            ORDER BY site_id`,
    });
    const adminMap = new Map<number, { username: string; email: string | null; hasPassword: boolean }>();
    for (const row of adminResult.rows) {
      const r = row as Record<string, unknown>;
      const siteId = Number(r.site_id);
      if (!adminMap.has(siteId)) {
        adminMap.set(siteId, {
          username: String(r.username || ""),
          email: r.email ? String(r.email) : null,
          hasPassword: Number(r.has_password ?? 0) === 1,
        });
      }
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
    const sites = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      const id = Number(r.id);
      const admin = adminMap.get(id);
      const countersForSite = counters.get(id) || { customers: 0, orders: 0 };
      return {
        id,
        slug: String(r.slug),
        displayName: String(r.display_name || r.slug),
        status: String(r.status || "active"),
        subscriptionStatus: String(r.subscription_status || "free"),
        subscriptionPrice: Number(r.subscription_price || 0),
        subscriptionCurrency: String(r.subscription_currency || "usd"),
        nextBillingAt: r.next_billing_at ? String(r.next_billing_at) : null,
        createdAt: r.created_at ? String(r.created_at) : null,
        ownerUserId: Number(r.owner_user_id),
        ownerUsername: r.owner_username ? String(r.owner_username) : null,
        ownerEmail: r.owner_email ? String(r.owner_email) : null,
        ownerBalance: Number(r.owner_balance || 0),
        adminUsername: (admin?.username || r.admin_username) ? (admin?.username || String(r.admin_username || "")) : null,
        adminEmail: (admin?.email || r.admin_email) ? (admin?.email || String(r.admin_email || "")) : null,
        hasPassword: admin?.hasPassword ?? false,
        suspendedReason: r.suspended_reason ? String(r.suspended_reason) : null,
        customers: countersForSite.customers,
        orders: countersForSite.orders,
        publicUrl: `${origin}/sites/${String(r.slug)}`,
        adminUrl: `${origin}/sites/${String(r.slug)}/admin`,
      };
    });

    return NextResponse.json({ sites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message === "Unauthorized") return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
    if (message === "Forbidden" || message === "2FA_REQUIRED" || message.includes("2FA")) {
      return NextResponse.json({ error: "غير مصرح — صلاحية الأدمن مطلوبة أو يتطلب التحقق بخطوتين" }, { status: 403 });
    }
    console.error("[admin-sites]", error);
    return NextResponse.json({ error: `تعذر تحميل المواقع: ${message}` }, { status: 500 });
  }
}