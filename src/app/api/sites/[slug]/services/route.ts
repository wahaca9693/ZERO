import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import { getPublicServiceId, loadServiceCatalog } from "@/lib/service-catalog";

const FIXED_API_ENDPOINT = "https://www.follower4.zone.id/api/v2";

/**
 * GET /api/sites/{slug}/services
 * Public catalog for a reseller site — uses branch's own API key to fetch services.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    const siteId = Number(loaded.site.id);

    // Get branch provider API key
    const providerResult = await db.execute({
      sql: "SELECT api_key FROM branch_providers WHERE site_id = ? AND is_active = 1 LIMIT 1",
      args: [siteId],
    });
    const providerRow = providerResult.rows[0] as unknown as Record<string, unknown> | undefined;
    const apiKey = providerRow?.api_key ? String(providerRow.api_key) : null;

    if (!apiKey) {
      // Fallback: use main platform catalog if no branch key configured
      const catalog = await loadServiceCatalog();
      const services = catalog.map((service) => ({
        service: getPublicServiceId(service),
        name: service.name,
        nameAr: service.nameAr || service.name,
        description: service.description,
        descriptionAr: service.descriptionAr || service.description,
        category: service.category,
        categoryAr: service.category,
        rate: service.rate,
        min: service.min,
        max: service.max,
        platform: service.category,
        serviceType: service.type,
        is_new: false,
      }));
      const categories = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));
      return NextResponse.json({ services, categories, count: services.length });
    }

    // Fetch services from fixed API endpoint using branch's API key (GET with key in query)
    const apiUrl = new URL(FIXED_API_ENDPOINT);
    apiUrl.searchParams.set("key", apiKey);
    apiUrl.searchParams.set("action", "services");
    const apiRes = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (Linux; Android 13)" },
      cache: "no-store",
    });
    const apiData = await apiRes.json().catch(() => null);

    if (!apiRes.ok || !Array.isArray(apiData)) {
      console.error("[branch-services] API error:", apiData);
      return NextResponse.json({ error: "تعذر جلب الخدمات من المزود" }, { status: 502 });
    }

    // Transform to branch format
    const services = apiData.map((svc: Record<string, unknown>) => ({
      service: String(svc.service || svc.id || ""),
      name: String(svc.name || ""),
      nameAr: String(svc.nameAr || svc.name || ""),
      description: String(svc.description || ""),
      descriptionAr: String(svc.descriptionAr || svc.description || ""),
      category: String(svc.category || ""),
      categoryAr: String(svc.categoryAr || svc.category || ""),
      rate: Number(svc.rate || 0),
      min: Number(svc.min || 0),
      max: Number(svc.max || 0),
      platform: String(svc.category || ""),
      serviceType: String(svc.type || "service"),
      is_new: Boolean(svc.is_new),
    }));

    const categories = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));
    return NextResponse.json({ services, categories, count: services.length });
  } catch (error) {
    console.error("[branch-services]", error);
    return NextResponse.json({ error: "تعذر تحميل الخدمات" }, { status: 500 });
  }
}
