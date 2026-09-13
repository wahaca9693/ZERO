import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import ProviderShell from "./ProviderShell";

type Props = { params: Promise<{ slug: string }> };

async function getSiteData(slug: string) {
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) return null;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
  const site = publicSiteData(loaded.site, origin, loaded.expired);
  return { site, expired: loaded.expired };
}

export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: Props }) {
  const { slug } = await params;
  const data = await getSiteData(slug);
  if (!data) notFound();

  const { site, expired } = data;
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };
  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const primaryLight = "#fdba74";
  const siteName = theme.siteName || site.displayName;
  const logoUrl = theme.logoUrl;

  return (
    <ProviderShell
      slug={slug}
      siteName={siteName}
      logoUrl={logoUrl}
      primary={primary}
      secondary={secondary}
      primaryLight={primaryLight}
      expired={expired}
    >
      {children}
    </ProviderShell>
  );
}