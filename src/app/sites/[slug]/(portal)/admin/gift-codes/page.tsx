import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import ResellerAdminModule from "../_lib/AdminModule";

type Props = { params: Promise<{ slug: string }> };

export default async function giftcodesPage({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
  const site = publicSiteData(loaded.site, origin, loaded.expired);
  const siteName = (site.theme as { siteName?: string }).siteName || site.displayName;
  void siteName;
  return <ResellerAdminModule slug={slug} title="أكواد الهدايا" description="إنشاء وإدارة أكواد الرصيد" endpoint="/admin/gift-codes" icon="gift" createLabel="إضافة" createFields={[{ key: "amount", label: "القيمة ($)", type: "number" },{ key: "count", label: "العدد", type: "number" }]} />;
}
