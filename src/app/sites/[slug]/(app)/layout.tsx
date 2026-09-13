import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import DashboardContent from "./dashboard/page"; // This is a placeholder, should be a separate content component
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ShoppingBag, Wallet, User, Settings, Ticket, MessageSquare } from "lucide-react";

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

export default async function ResellerLayout({ children, params }: { children: React.ReactNode; params: Props }) {
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
    <div className="min-h-screen bg-[#0b0b09] text-white font-sans" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 h-screen sticky top-0 border-r border-white/5 bg-[#0f0f0f] p-6 flex flex-col hidden lg:flex">
          <div className="mb-10 flex items-center gap-3 px-2">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-[var(--site-primary)] flex items-center justify-center font-black text-black">
                {siteName[0]}
              </div>
            )}
            <span className="font-black text-lg truncate">{siteName}</span>
          </div>

          <nav className="space-y-2 flex-1">
            <SidebarItem href={`/sites/${slug}/(app)/dashboard`} icon={<LayoutDashboard size={20} />} label="الرئيسية" active />
            <SidebarItem href={`/sites/${slug}/(app)/services`} icon={<ShoppingBag size={20} />} label="الخدمات" />
            <SidebarItem href={`/sites/${slug}/(app)/wallet`} icon={<Wallet size={20} />} label="المحفظة" />
            <SidebarItem href={`/sites/${slug}/(app)/orders`} icon={<ShoppingBag size={20} />} label="طلباتي" />
            <SidebarItem href={`/sites/${slug}/(app)/tickets`} icon={<MessageSquare size={20} />} label="التذاكر" />
            <SidebarItem href={`/sites/${slug}/(app)/settings`} icon={<Settings size={20} />} label="الإعدادات" />
          </nav>

          <div className="pt-6 border-t border-white/5">
            <a href={`/sites/${slug}`} className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-white font-bold transition-all">
              عرض الموقع الرسمي
            </a>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <a 
      href={href} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
        active ? "bg-[var(--site-primary)] text-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}