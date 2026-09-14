import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import { getPublicServiceId, loadServiceCatalog } from "@/lib/service-catalog";

/**
 * GET /api/sites/{slug}/services
 * Public catalog for a reseller site — identical response shape to the official
 * /api/services so the official services component works on the branch too.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });

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

    // Match the official payload: { services, categories, count }
    return NextResponse.json({ services, categories, count: services.length });
  } catch (error) {
    console.error("[site-services]", error);
    return NextResponse.json({ error: "تعذر تحميل الخدمات" }, { status: 500 });
  }
}