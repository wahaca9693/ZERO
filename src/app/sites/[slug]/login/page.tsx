import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import LoginForm from "./LoginForm";

type PageProps = { params: Promise<{ slug: string }> };

export default async function ResellerLoginPage({ params }: PageProps) {
  await initDb();
  const { slug } = await params;
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://cxxv.vercel.app";
  const site = publicSiteData(loaded.site, origin, loaded.expired);
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };

  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const siteName = theme.siteName || site.displayName;
  const logoUrl = theme.logoUrl;

  return (
    <LoginForm
      slug={slug}
      siteName={siteName}
      logoUrl={logoUrl}
      primary={primary}
      secondary={secondary}
    />
  );
}
