import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import WalletContent from "./WalletContent";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getSiteData(slug: string) {
  await initDb();
  const loaded = await (await import("@/lib/reseller-sites")).loadPublicSite(slug);
  if (!loaded.site) return null;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
  const site = (await import("@/lib/reseller-sites")).publicSiteData(loaded.site, origin, loaded.expired);
  return { site, expired: loaded.expired };
}

export default async function WalletPage({ params }: Props) {
  const { slug } = await params;
  const data = await getSiteData(slug);
  
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
            <h1 className="text-2xl font-black text-white">المحفظة</h1>
            <p className="mt-1 text-zinc-400">إدارة رصيدك وعملياتك المالية</p>
          </div>
          <div className="flex gap-2">
            <a href={`/sites/${slug}/deposit`} className="flex items-center gap-2 rounded-xl bg-[var(--site-primary)] px-4 py-2 font-bold text-black hover:brightness-110 transition-all">
              <span>⬇️</span> إيداع
            </a>
            <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold text-white hover:bg-white/10 transition-all">
              <span>⬆️</span> سحب
            </button>
          </div>
        </div>
      </div>

      <WalletContent 
        slug={slug} 
        siteName={siteName} 
        primary={primary}
        secondary={secondary}
        expired={expired}
      />
    </div>
  );
}