import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAccount } from "@/lib/reseller-auth";

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/sites/{slug}/sites — list sub-sites created by this site's admins/users
 * POST /api/sites/{slug}/sites — create a sub-site from within the branch
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAccount(slug);
    const siteId = Number(auth.account.site_id);

    const result = await db.execute({
      sql: `SELECT id, slug, display_name, status, created_at
            FROM reseller_sites WHERE parent_site_id = ? ORDER BY created_at DESC`,
      args: [siteId],
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
    const sites = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id),
        slug: String(r.slug),
        displayName: String(r.display_name || r.slug),
        status: String(r.status || "active"),
        createdAt: r.created_at ? String(r.created_at) : null,
        publicUrl: `${origin}/sites/${String(r.slug)}`,
        adminUrl: `${origin}/sites/${String(r.slug)}/admin`,
      };
    });

    return NextResponse.json({ sites });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unexpected";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAccount(slug);
    const parentSiteId = Number(auth.account.site_id);

    const body = await request.json();
    const { slug: newSlug, displayName } = body as { slug?: string; displayName?: string };

    if (!newSlug || !/^[a-z0-9][a-z0-9_-]{1,31}$/.test(newSlug)) {
      return NextResponse.json({ error: "اسم الفرع غير صالح — استخدم أحرف إنجليزية صغيرة وأرقام وشرطة" }, { status: 400 });
    }
    if (!displayName || displayName.trim().length < 2) {
      return NextResponse.json({ error: "اسم الموقع مطلوب" }, { status: 400 });
    }

    // Check duplicate slug
    const dup = await db.execute({ sql: "SELECT id FROM reseller_sites WHERE slug = ? LIMIT 1", args: [newSlug] });
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: "الاسم مستخدم بالفعل — اختر اسماً آخر" }, { status: 409 });
    }

    // Get parent theme as template
    const parent = await db.execute({
      sql: "SELECT theme_json, payment_methods_json, owner_user_id FROM reseller_sites WHERE id = ? LIMIT 1",
      args: [parentSiteId],
    });
    const parentRow = parent.rows[0] as unknown as Record<string, unknown> | undefined;
    const ownerUserId = Number(parentRow?.owner_user_id || auth.session.userId || 0);
    const creationKey = `sub_${parentSiteId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const result = await db.execute({
      sql: `INSERT INTO reseller_sites
            (owner_user_id, creation_key, slug, display_name, parent_site_id, subscription_status, status, subscription_price, subscription_currency, theme_json, payment_methods_json, provider_access_enabled)
            VALUES (?, ?, ?, ?, ?, 'active', 'active', 0, 'USD', ?, ?, 0)`,
      args: [ownerUserId, creationKey, newSlug, displayName.trim(), parentSiteId, String(parentRow?.theme_json || "{}"), String(parentRow?.payment_methods_json || "[]")],
    });

    const siteId = Number(result.lastInsertRowid);

    // Auto-create admin account for the creator in the new sub-site
    // Reuse the parent account's password hash so the creator can log in
    // to the sub-site admin with the same credentials.
    const parentAccount = await db.execute({
      sql: "SELECT password_hash FROM reseller_accounts WHERE id = ? LIMIT 1",
      args: [auth.account.id],
    });
    const parentHash = (parentAccount.rows[0] as unknown as Record<string, unknown> | undefined)?.password_hash;

    const adminResult = await db.execute({
      sql: `INSERT INTO reseller_accounts (site_id, username, email, password_hash, role, balance, terms_accepted)
            VALUES (?, ?, ?, ?, 'admin', 0, 1)`,
      args: [siteId, auth.account.username, auth.account.email || "", String(parentHash || "")],
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
    return NextResponse.json({
      success: true,
      site: {
        id: siteId,
        slug: newSlug,
        displayName: displayName.trim(),
        publicUrl: `${origin}/sites/${newSlug}`,
        adminUrl: `${origin}/sites/${newSlug}/admin`,
      },
      message: `تم إنشاء الفرع "${newSlug}" — يُدار من هنا`,
      accountId: Number(adminResult.lastInsertRowid),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unexpected";
    console.error("[site-create-sub]", error);
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500 });
  }
}