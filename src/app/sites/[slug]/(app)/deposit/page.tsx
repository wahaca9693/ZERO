import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import DepositForm from "./DepositForm";

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

export default async function DepositPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSiteData(slug);
  
  if (!data) notFound();
  
  const { site, expired } = data;
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };
  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const siteName = theme.siteName || site.displayName;
  const logoUrl = theme.logoUrl;

  return (
    <div className="space-y-6" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
      <div className="rounded-2xl bg-gradient-to-br from-[var(--site-primary)]/20 to-[var(--site-secondary)]/20 border border-[var(--site-primary)]/30 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">شحن الرصيد</h1>
            <p className="mt-1 text-zinc-400">رصيدك الحالي: <span className="font-black text-emerald-400">1,250.75 $</span></p>
          </div>
        </div>
      </div>
      <DepositForm 
        slug={slug} 
        siteName={siteName} 
        logoUrl={theme.logoUrl}
        primary={primary}
        secondary={secondary}
        balance={1250.75}
        expired={expired}
      />
    </div>
  );
}

async function getSiteData(slug: string) {
  await initDb();
  const loaded = await (await import("@/lib/reseller-sites")).loadPublicSite(slug);
  if (!loaded.site) return null;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://cxxv.vercel.app";
  const site = (await import("@/lib/reseller-sites")).publicSiteData(loaded.site, origin, loaded.expired);
  return { site, expired: loaded.expired };
}

const { site, expired } = await getSiteData(slug);

if (!data) notFound();

const { site, expired } = data;
const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };
const primary = theme.primaryColor || "#f97316";
const secondary = theme.secondaryColor || "#fbbf24";
const siteName = theme.siteName || site.displayName;

return (
  <div className="space-y-6" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
    <div className="rounded-2xl bg-gradient-to-br from-[var(--site-primary)]/20 to-[var(--site-secondary)]/20 border border-[var(--site-primary)]/30 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">شحن الرصيد</h1>
          <p className="mt-1 text-zinc-400">رصيدك الحالي: <span className="font-black text-emerald-400">1,250.75 $</span></p>
        </div>
      </div>
      <DepositForm 
        slug={slug} 
        siteName={siteName} 
        logoUrl={theme.logoUrl}
        primary={primary}
        secondary={secondary}
        balance={1250.75}
        expired={expired}
      />
    </div>
  );
}