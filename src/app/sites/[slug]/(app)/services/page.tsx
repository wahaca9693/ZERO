import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import ServicesContent from "./ServicesContent";

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

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
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
            <h1 className="text-2xl font-black text-white">متجر الخدمات</h1>
            <p className="mt-1 text-zinc-400">تصفح واطلب أفضل الخدمات الرقمية بأفضل الأسعار</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input 
              type="text" 
              placeholder="ابحث عن خدمة..." 
              className="w-72 pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--site-primary)]"
              defaultValue=""
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-2 min-w-max">
          <button className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--site-primary)] px-4 py-2 text-sm font-black text-black">
            <Package className="h-4 w-4" /> الكل
          </button>
          <button className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white">
            <span>📷</span>
            <span>Instagram</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">45</span>
          </button>
          <button className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white">
            <span>▶️</span>
            <span>YouTube</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">32</span>
          </button>
          <button className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white">
            <span>🎵</span>
            <span>TikTok</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">28</span>
          </button>
          <button className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white">
            <span>🐦</span>
            <span>Twitter/X</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">22</span>
          </button>
          <button className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white">
            <span>✈️</span>
            <span>Telegram</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">18</span>
          </button>
        </div>
      </div>

      <ServicesContent 
        slug={slug} 
        siteName={siteName} 
        primary={primary}
        secondary={secondary}
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
          <h1 className="text-2xl font-black text-white">متجر الخدمات</h1>
          <p className="mt-1 text-zinc-400">تصفح واطلب أفضل الخدمات الرقمية بأفضل الأسعار</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input 
            type="text" 
            placeholder="ابحث عن خدمة..." 
            className="w-72 pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--site-primary)]"
            defaultValue=""
          />
        </div>
      </div>
    </div>

    <div className="overflow-x-auto pb-4">
      <div className="flex gap-2 min-w-max">
        <button className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--site-primary)] px-4 py-2 text-sm font-black text-black">
          <Package className="h-4 w-4" /> الكل
        </button>
        <button className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white">
          <span>📷</span>
          <span>Instagram</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">45</span>
        </button>
        <button className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white">
          <span>▶️</span>
          <span>YouTube</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">32</span>
        </button>
        <button className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white">
          <span>🎵</span>
          <span>TikTok</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">28</span>
        </button>
        <button className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white">
          <span>🐦</span>
          <span>Twitter/X</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">22</span>
        </button>
        <button className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white">
          <span>✈️</span>
          <span>Telegram</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">18</span>
        </button>
      </div>
    </div>

    <ServicesContent 
      slug={slug} 
      siteName={siteName} 
      primary={primary}
      secondary={secondary}
      expired={expired}
    />
  </div>
);