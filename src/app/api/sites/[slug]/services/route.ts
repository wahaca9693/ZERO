import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";
import { loadServiceCatalog, getPublicServiceId } from "@/lib/service-catalog";

type Params = { params: Promise<{ slug: string }> };

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
        platform: service.category,
        serviceType: service.type,
        is_new: false,
      }));
      const categories = Array.from(new Set(services.map((s: { category?: string }) => s.category || "").filter(Boolean)));
      return NextResponse.json({ services, categories, count: services.length });
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
        allServices.push({
          service: String(row.remote_service_id),
          name: String(row.name),
          nameAr: String(row.name_ar || row.name),
          description: String(row.description || ""),
          descriptionAr: String(row.description_ar || row.description || ""),
          category: String(row.category),
          categoryAr: String(row.category),
          rate: Number(row.rate),
          min: Number(row.min),
          max: Number(row.max),
          platform: String(row.category),
          serviceType: String(row.type || "service"),
          is_new: false,
        });
      }
    }

    const categories = Array.from(new Set(allServices.map((s) => String(s.category)).filter(Boolean)));
    return NextResponse.json({ services: allServices, categories, count: allServices.length });
  } catch (error) {
    console.error("[branch-services]", error);
    return NextResponse.json({ error: "تعذر تحميل الخدمات" }, { status: 500 });
  }
}