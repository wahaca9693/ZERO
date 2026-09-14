import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/me/sites
 * Logged-in user's OWN reseller sites (their saved links).
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const userId = user.userId;
    if (!userId) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
    }
    await initDb();

    const result = await db.execute({
      sql: `SELECT s.id, s.slug, s.display_name, s.status, s.subscription_status,
                   s.subscription_price, s.subscription_currency, s.next_billing_at, s.created_at
            FROM reseller_sites s
            WHERE s.owner_user_id = ?
            ORDER BY s.created_at DESC`,
      args: [userId],
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
        publicUrl: `${origin}/sites/${String(r.slug)}`,
        adminUrl: `${origin}/sites/${String(r.slug)}/admin`,
      };
    });

    return NextResponse.json({ sites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message === "Unauthorized") return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
    if (message === "2FA_REQUIRED") return NextResponse.json({ error: "يرجى تأكيد رمز الأمان أولاً" }, { status: 403 });
    console.error("[me-sites]", error);
    return NextResponse.json({ error: "تعذر تحميل مواقعك" }, { status: 500 });
  }
}