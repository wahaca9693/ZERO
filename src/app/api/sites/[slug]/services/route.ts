import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import { getPublicServiceId, loadServiceCatalog } from "@/lib/service-catalog";

/**
 * GET /api/sites/{slug}/services
 * Public catalog for a reseller site — same service catalog as the main
 * platform, returned for the reseller front-end.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });

    const catalog = await loadServiceCatalog();
    const services = catalog.map((service) => ({
      id: getPublicServiceId(service),
      name: service.nameAr || service.name,
      nameEn: service.name,
      description: service.descriptionAr || service.description,
      category: service.category,
      rate: service.rate,
      min: service.min,
      max: service.max,
      type: service.type,
      source: service.source,
    }));

    const categories = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));

    return NextResponse.json({ services, categories, count: services.length });
  } catch (error) {
    console.error("[site-services]", error);
    return NextResponse.json({ error: "تعذر تحميل الخدمات" }, { status: 500 });
  }
}