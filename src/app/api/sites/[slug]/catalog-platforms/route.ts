import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import { publicCatalogPlatform } from "@/lib/catalog-platform";

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/sites/{slug}/catalog-platforms
 * Returns the same catalog platform buttons as the official API,
 * so the services page shows platform filter icons.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ platforms: [] });

    const result = await db.execute(
      `SELECT id, label_ar, label_en, description_ar, description_en, logo_url,
              service_ids, is_active, sort_order
       FROM catalog_platform_buttons
       WHERE is_active = 1
       ORDER BY sort_order, id`
    );
    const platforms = result.rows.map((row) => publicCatalogPlatform(row as Record<string, unknown>));
    return NextResponse.json({ platforms }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ platforms: [] });
  }
}