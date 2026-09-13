import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import TicketsContent from "./TicketsContent";

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

export default async function TicketsPage({ params }: { params: Promise<{ slug: string }> }) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">الدعم الفني والتذاكر</h1>
          <p className="text-zinc-400">تواصل مع فريق الدعم لأي استفسارات أو مشاكل</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-[var(--site-primary)] px-5 py-3 font-black text-black hover:brightness-110">
          <Plus size={18} /> تذكرة جديدة
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <select className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white outline-none" defaultValue="all">
          <option value="all">جميع التذاكر</option>
          <option value="open">مفتوحة</option>
          <option value="closed">مغلقة</option>
          <option value="in_progress">قيد المتابعة</option>
        </select>
        <input type="text" placeholder="بحث في التذاكر..." className="w-64 pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--site-primary)]" />
      </div>

      <TicketsContent 
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-white">الدعم الفني والتذاكر</h1>
        <p className="text-zinc-400">تواصل مع فريق الدعم لأي استفسارات أو مشاكل</p>
      </div>
      <button className="flex items-center gap-2 rounded-xl bg-[var(--site-primary)] px-5 py-3 font-black text-black hover:brightness-110">
        <Plus size={18} /> تذكرة جديدة
      </button>
    </div>

    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <select className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white outline-none" defaultValue="all">
        <option value="all">جميع التذاكر</option>
        <option value="open">مفتوحة</option>
        <option value="closed">مغلقة</option>
        <option value="in_progress">قيد المتابعة</option>
      </select>
      <input type="text" placeholder="بحث في التذاكر..." className="w-64 pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--site-primary)]" />
    </div>

    <TicketsContent 
      slug={slug} 
      siteName={siteName} 
      primary={primary}
      secondary={secondary}
      expired={expired}
    />
  </div>
);