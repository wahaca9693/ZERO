import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";
import { loadServiceCatalog, getPublicServiceId } from "@/lib/service-catalog";
import { defaultPlatformOptions, detectPlatform, detectServiceType, normalizePlatformId, platformOption } from "@/lib/platform-mapping";
import { publicCatalogPlatform, type CatalogPlatform } from "@/lib/catalog-platform";

type Params = { params: Promise<{ slug: string }> };

function buildPlatformOptions(customPlatforms: CatalogPlatform[]) {
  const legacyPlatforms = defaultPlatformOptions.filter((platform) => platform.id !== "all");
  const customIds = new Set(customPlatforms.map((platform) => platform.id));
  return [
    { ...platformOption("all"), color: "var(--color-primary)" },
    ...legacyPlatforms.filter((platform) => !customIds.has(platform.id)),
    ...customPlatforms.map((platform) => ({
      id: platform.id,
      name: platform.label_ar,
      nameAr: platform.label_ar,
      nameEn: platform.label_en,
      descriptionAr: platform.description_ar,
      descriptionEn: platform.description_en,
      logoUrl: platform.logo_url,
      serviceIds: platform.service_ids,
      color: "var(--color-primary)",
      count: platform.service_ids.length,
    })),
  ];
}

async function getCustomPlatforms(): Promise<CatalogPlatform[]> {
  const result = await db.execute(`
    SELECT id, label_ar, label_en, description_ar, description_en, logo_url,
           service_ids, is_active, sort_order
    FROM catalog_platform_buttons
    WHERE is_active = 1
    ORDER BY sort_order, id
  `);
  return result.rows.map((row) => publicCatalogPlatform(row as Record<string, unknown>));
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    // Get all active providers for this site
    const provResult = await db.execute({
      sql: "SELECT id, name FROM branch_providers WHERE site_id = ? AND is_active = 1 ORDER BY id",
      args: [siteId],
    });
    const providers = provResult.rows as unknown as Array<{ id: number; name: string }>;

    // If no active providers: fallback to main official catalog
    if (providers.length === 0) {
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
        platform: normalizePlatformId(detectPlatform(service.category, service.name)),
        serviceType: detectServiceType(service.name),
        is_new: false,
      }));
      const categories = Array.from(new Set(services.map((s: { category?: string }) => s.category || "").filter(Boolean)));
      const customPlatforms = await getCustomPlatforms().catch(() => [] as CatalogPlatform[]);
      return NextResponse.json({ services, categories, platforms: buildPlatformOptions(customPlatforms), count: services.length });
    }

    // Collect services from all active providers (not hidden)
    const allServices: Array<Record<string, unknown>> = [];
    for (const prov of providers) {
      const svcResult = await db.execute({
        sql: "SELECT remote_service_id, name, name_ar, description, rate, min, max, category, type FROM branch_provider_services WHERE provider_id = ? AND is_hidden = 0 ORDER BY category, name",
        args: [prov.id],
      });
      const rows = svcResult.rows as unknown as Array<Record<string, unknown>>;
      for (const row of rows) {
        const name = String(row.name || "");
        const category = String(row.category || "");
        allServices.push({
          service: String(row.remote_service_id),
          name,
          nameAr: String(row.name_ar || row.name || ""),
          description: String(row.description || ""),
          descriptionAr: String(row.description_ar || row.description || ""),
          category,
          categoryAr: category,
          rate: Number(row.rate),
          min: Number(row.min),
          max: Number(row.max),
          // المنصة تُشتق تلقائياً من اسم الخدمة وفئتها — تماماً مثل المنصة الرسمية
          platform: normalizePlatformId(detectPlatform(category, name)),
          serviceType: detectServiceType(name),
          is_new: false,
        });
      }
    }

    const categories = Array.from(new Set(allServices.map((s) => String(s.category)).filter(Boolean)));
    const customPlatforms = await getCustomPlatforms().catch(() => [] as CatalogPlatform[]);
    return NextResponse.json({
      services: allServices,
      categories,
      platforms: buildPlatformOptions(customPlatforms),
      count: allServices.length,
    });
  } catch (error) {
    console.error("[branch-services]", error);
    return NextResponse.json({ error: "تعذر تحميل الخدمات" }, { status: 500 });
  }
}