import { redirect } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  CreditCard, 
  Wallet, 
  Settings, 
  ShoppingBag, 
  Users, 
  Ticket, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown, 
  Bell, 
  HelpCircle, 
  ArrowRight, 
  Package, 
  DollarSign, 
  Shield, 
  BarChart2,
} from "lucide-react";
import { useState, useEffect } from "react";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

const navigation = [
  { name: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
  { name: "الخدمات", href: "/services", icon: Package },
  { name: "المحفظة", href: "/wallet", icon: Wallet },
  { name: "طلباتي", href: "/orders", icon: ShoppingBag },
  { name: "التذاكر", href: "/tickets", icon: Ticket },
  { name: "الإعدادات", href: "/settings", icon: Settings },
];

async function getSiteData(slug: string) {
  await initDb();
  const loaded = await (await import("@/lib/reseller-sites")).loadPublicSite(slug);
  if (!loaded.site) return null;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://cxxv.vercel.app";
  const site = (await import("@/lib/reseller-sites")).publicSiteData(loaded.site, origin, loaded.expired);
  return { site, expired: loaded.expired };
}

export default async function ResellerAppLayout({ children, params }: Props) {
  const { slug } = await params;
  const data = await getSiteData(slug);
  
  if (!data) {
    redirect(`/sites/${slug}`);
  }
  
  const { site, expired } = data;
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };
  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const siteName = theme.siteName || site.displayName;
  const logoUrl = theme.logoUrl;

  return (
    <html dir="rtl" lang="ar">
      <head>
        <title>{siteName} - {siteName === site.displayName ? "منصة خدمات رقمية" : "منصتك الخاصة"}</title>
        <meta name="description" content={`منصة ${siteName} للخدمات الرقمية`} />
        <link rel="icon" href={theme.logoUrl || "/favicon.ico"} />
      </head>
      <body className="min-h-screen bg-[#0b0b09] text-white antialiased" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
        <ResellerAppShell 
          slug={slug} 
          siteName={theme.siteName || site.displayName}
          logoUrl={theme.logoUrl}
          primary={primary}
          secondary={secondary}
          expired={expired}
        >
          {children}
        </ResellerAppShell>
      </body>
    </html>
  );
}

function ResellerAppShell({ 
  children, 
  slug, 
  siteName, 
  logoUrl, 
  primary, 
  secondary, 
  expired 
}: { 
  children: React.ReactNode;
  slug: string;
  siteName: string;
  logoUrl?: string;
  primary: string;
  secondary: string;
  expired: boolean;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id: string, title: string, message: string, time: string, read: boolean}>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch(`/api/sites/${slug}/user/me`)
      .then(res => res.json())
      .then(data => {
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.notifications.filter((n: any) => !n.read).length);
        }
      })
      .catch(() => {});
  }, [slug]);

  const handleLogout = async () => {
    await fetch(`/api/sites/${slug}/auth/logout`, { method: "POST" });
    window.location.href = `/sites/${slug}/login`;
  };

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b09] px-4" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
        <div className="max-w-md w-full text-center p-8 rounded-2xl border border-amber-400/30 bg-amber-400/10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-3xl">⏳</div>
          <h2 className="text-2xl font-black text-amber-200">الموقع متوقف مؤقتاً</h2>
          <p className="mt-3 leading-7 text-amber-100/75">انتهت مدة الاشتراك. يرجى تجديد الاشتراك من لوحة المالك لإعادة تفعيل الموقع.</p>
          <a href={`/sites/${slug}/login`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-black text-black">تسجيل دخول المالك</a>
        </div>
      );
    }

  return (
    <div className="min-h-screen bg-[#0b0b09]" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-[#111] border-r border-white/10 transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            <Link href={`/sites/${slug}/dashboard`} className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--site-primary)] to-[var(--site-secondary)] text-[#111] font-black text-xl">✨</div>
              )}
              <span className="font-black text-xl text-white truncate">{siteName}</span>
            </Link>
            <button 
              className="lg:hidden text-zinc-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="التنقل الرئيسي">
            {navigation.map((item) => {
              const isActive = pathname === `/sites/${slug}${item.href}` || pathname.startsWith(`/sites/${slug}${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={`/sites/${slug}${item.href}`}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-[var(--site-primary)]/15 text-[var(--site-primary)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                  style={{ "--site-primary": primary } as React.CSSProperties}
                >
                  <Icon size={20} strokeWidth={2.5} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--site-primary)] to-[var(--site-secondary)] text-[#111] font-black text-lg">
                @
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">مستخدم</p>
                <p className="text-xs text-zinc-500 truncate">user@domain.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <button
        className="fixed bottom-4 right-4 z-40 lg:hidden rounded-full bg-[var(--site-primary)] p-3 shadow-lg shadow-[var(--site-primary)]/30"
        onClick={() => setSidebarOpen(true)}
        aria-label="فتح القائمة"
        style={{ "--site-primary": primary } as React.CSSProperties}
      >
        <Menu size={24} className="text-black" />
      </button>

      <main className="lg:pl-64 min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/10 bg-[#0b0b09]/80 backdrop-blur-xl px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-white lg:hidden">{siteName}</h1>
            <div className="hidden lg:flex lg:items-center lg:gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-zinc-400">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--site-primary)] text-[10px] font-black text-black">{unreadCount}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                onClick={() => setNotifications(prev => prev.length > 0 ? [] : [])}
                aria-label="الإشعارات"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--site-primary)] text-[10px] font-black text-black">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <div className="relative">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="قائمة المستخدم"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--site-primary)] to-[var(--site-secondary)] text-[#111] font-black text-sm">
                  م
                </div>
                <ChevronDown className="h-4 w-4 text-zinc-400 ml-1" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#111] py-2 shadow-xl">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="font-bold text-white truncate">مستخدم</p>
                    <p className="text-xs text-zinc-500 truncate">user@domain.com</p>
                  </div>
                  <Link href={`/sites/${slug}/profile`} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">
                    <User size={18} /> الملف الشخصي
                  </Link>
                  <Link href={`/sites/${slug}/settings`} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">
                    <Settings size={18} /> الإعدادات
                  </Link>
                  <hr className="my-2 border-white/10" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
                    <LogOut size={18} /> تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
          {expired && (
            <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm font-bold text-amber-100">
              انتهى الاشتراك. الموقع متوقف حتى التجديد.
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}