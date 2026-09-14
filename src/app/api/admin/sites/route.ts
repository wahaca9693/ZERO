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

    const result = await db.execute({
      sql: `SELECT s.id, s.slug, s.display_name, s.status, s.subscription_status,
                   s.subscription_price, s.subscription_currency, s.next_billing_at,
                   s.created_at, s.owner_user_id,
                   u.username AS owner_username, u.email AS owner_email, u.balance AS owner_balance,
                   (SELECT COUNT(*) FROM reseller_accounts ra WHERE ra.site_id = s.id) AS customer_count,
                   (SELECT COUNT(*) FROM reseller_orders ro WHERE ro.site_id = s.id) AS order_count
            FROM reseller_sites s
            LEFT JOIN users u ON u.id = s.owner_user_id
            ORDER BY s.created_at DESC`,
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
    const sites = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id),
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
        customers: Number(r.customer_count || 0),
        orders: Number(r.order_count || 0),
        publicUrl: `${origin}/sites/${String(r.slug)}`,
        adminUrl: `${origin}/sites/${String(r.slug)}/admin`,
      };
    });

    return NextResponse.json({ sites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message === "Unauthorized") return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: "غير مصرح — صلاحية الأدمن مطلوبة" }, { status: 403 });
    console.error("[admin-sites]", error);
    return NextResponse.json({ error: "تعذر تحميل المواقع" }, { status: 500 });
  }
}