import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";
import { loadServiceCatalog, getPublicServiceId } from "@/lib/service-catalog";

type Params = { params: Promise<{ slug: string }> };

const FIXED_API_ENDPOINT = "https://www.follower4.zone.id/api/v2";

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    const hasProvider = await db.execute({
      sql: "SELECT id FROM branch_providers WHERE site_id = ? LIMIT 1",
      args: [siteId],
    });

    // Fallback to main catalog if no provider is linked
    if (!hasProvider.rows[0]) {
      const catalog = await loadServiceCatalog();
      const services = catalog.map((service) => ({
        service: getPublicServiceId(service),
        name: service.name,
        nameAr: service.nameAr,
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
      const categories = Array.from(new Set(services.map((s: { category?: string }) => s.category || "").filter(Boolean)));
      return NextResponse.json({ services, categories, count: services.length });
    }

    // Get the actual user's API key who linked the branch
    const apiKeyRow = await db.execute({
      sql: "SELECT ak.api_key FROM branch_providers bp JOIN api_keys ak ON ak.user_id = bp.owner_user_id WHERE bp.site_id = ? LIMIT 1",
      args: [siteId],
    });
    const apiKey = apiKeyRow.rows[0]?.api_key as string;

    if (!apiKey) {
      return NextResponse.json({ error: "لم يتم العثور على مفتاح مرتبط بالفرع" }, { status: 502 });
    }

    // Call official API using the user's valid key
    const apiUrl = new URL(FIXED_API_ENDPOINT);
    apiUrl.searchParams.set("key", apiKey);
    apiUrl.searchParams.set("action", "services");
    
    const apiRes = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (Linux; Android 13)" },
      cache: "no-store",
    });
    const apiData = await apiRes.json().catch(() => null);

    // API returns { services: [...], count, total, page, limit, has_more } or bare array
    const rawList = Array.isArray(apiData) ? apiData : (apiData as Record<string, unknown>)?.services;
    const servicesList = Array.isArray(rawList) ? (rawList as Array<Record<string, unknown>>) : null;

    if (!apiRes.ok || !servicesList) {
      console.error("[branch-services] API error:", apiData);
      return NextResponse.json({ error: "تعذر جلب الخدمات من المزود" }, { status: 502 });
    }

    // Transform to branch format
    const services = servicesList.map((svc: Record<string, unknown>) => ({
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

    const categories = Array.from(new Set(services.map((s: { category?: string }) => s.category || "").filter(Boolean)));
    return NextResponse.json({ services, categories, count: services.length });
  } catch (error) {
    console.error("[branch-services]", error);
    return NextResponse.json({ error: "تعذر تحميل الخدمات" }, { status: 500 });
  }
}
