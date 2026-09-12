import { redirect } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getSiteData(slug: string) {
  await initDb();
  const loaded = await (await import("@/lib/reseller-sites")).loadPublicSite(slug);
  if (!loaded.site) return null;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://cxxv.vercel.app";
  const site = (await import("@/lib/reseller-sites")).publicSiteData(loaded.site, origin, loaded.expired);
  return { site, expired: loaded.expired };
}

export default async function SiteRootPage({ params }: Props) {
  const { slug } = await params;
  const data = await getSiteData(slug);
  
  if (!data) redirect(`/sites/${slug}/login`);
  
  const { site, expired } = data;
  
  // Redirect to dashboard if logged in (check via cookie/session)
  // For now, redirect to login to show the branded login page
  redirect(`/sites/${slug}/login`);
}