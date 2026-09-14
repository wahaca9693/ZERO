import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { requireSiteAuth } from "@/lib/session";

type PaymentMethod = { name: string; instructions: string; enabled: boolean };

/**
 * GET /api/sites/{slug}/deposit
 * Returns the payment methods configured for THIS reseller site so the
 * front-end can render a deposit screen unique to the branch.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
    const site = publicSiteData(loaded.site, origin, loaded.expired);

    const methods = (site.paymentMethods as PaymentMethod[] | undefined) || [];
    const enabled = methods.filter((method) => method.enabled !== false);

    return NextResponse.json({ paymentMethods: enabled });
  } catch (error) {
    console.error("[site-deposit]", error);
    return NextResponse.json({ error: "تعذر تحميل طرق الدفع" }, { status: 500 });
  }
}