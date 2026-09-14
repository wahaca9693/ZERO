import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import ResellerAdminModule from "../_lib/AdminModule";

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
  const site = publicSiteData(loaded.site, origin, loaded.expired);
  void (site.theme as { siteName?: string }).siteName;
  return <ResellerAdminModule slug={slug} title="إيداعات الكريبتو" description="مراجعة الإيداعات والتحويلات crypto وحالتها" endpoint="/admin/crypto-deposits" icon="crypto" />;
}
