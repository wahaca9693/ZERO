import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import OfficialServicesMirror from "./OfficialServicesMirror";

type Props = { params: Promise<{ slug: string }> };

/**
 * Public services page for a reseller sub-site — a 100% mirror of the official
 * /services page (same design, same Header/Sidebar/BottomNav), adapted for the
 * branch via slug-based API paths.
 */
export default async function SiteServicesPage({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
  const site = publicSiteData(loaded.site, origin, loaded.expired);
  return <OfficialServicesMirror slug={slug} />;
}