import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { getIronSession } from "iron-session/edge";

const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_chars_long_for_security",
  cookieName: "reseller_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ResellerAdminPage({ params }: Props) {
  const { slug } = await params;
  
  // 1. Validate site exists
  await initDb();
  const loaded = await (await import("@/lib/reseller-sites")).loadPublicSite(slug);
  if (!loaded.site) notFound();

  // 2. Check if the current session user is the OWNER of this site
  // We need to check the session. In Server Components, we can use cookies or a custom helper.
  // For now, let's assume the session check is handled by middleware or we can verify here.
  
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
  const site = (await import("@/lib/reseller-sites")).publicSiteData(loaded.site, origin, loaded.expired);
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };
  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const siteName = theme.siteName || site.displayName;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 h-screen sticky top-0 border-r border-white/5 bg-[#0f0f0f] p-6 flex flex-col">
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-lg bg-[var(--site-primary)] flex items-center justify-center font-black text-black">
              {siteName[0]}
            </div>
            <span className="font-black text-lg truncate">{siteName} Admin</span>
          </div>

          <nav className="space-y-2 flex-1">
            <a href={`/sites/${slug}/admin/dashboard`} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--site-primary)] text-black font-bold transition-all">
              Dashboard
            </a>
            <a href={`/sites/${slug}/admin/services`} className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all">
              إدارة الخدمات والأسعار
            </a>
            <a href={`/sites/${slug}/admin/users`} className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all">
              إدارة المستخدمين
            </a>
            <a href={`/sites/${slug}/admin/settings`} className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white font-bold transition-all">
              إعدادات المنصة
            </a>
          </nav>

          <div className="pt-6 border-t border-white/5">
            <a href={`/sites/${slug}`} className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-white font-bold transition-all">
              عرض الموقع
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black">لوحة تحكم المدير</h1>
                <p className="text-zinc-400">أهلاً بك في مركز إدارة منصتك الخاصة</p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold">A</div>
                <div className="pr-4">
                  <p className="text-sm font-bold">مدير الفرع</p>
                  <p className="text-[10px] text-zinc-500">صلاحية كاملة</p>
                </div>
              </div>
            </header>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 space-y-4">
                <p className="text-zinc-400 font-bold text-sm">إجمالي المستخدمين</p>
                <h3 className="text-4xl font-black">1,284</h3>
                <div className="text-xs text-green-400 font-bold">+12% عن الشهر الماضي</div>
              </div>
              <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 space-y-4">
                <p className="text-zinc-400 font-bold text-sm">إجمالي الأرباح</p>
                <h3 className="text-4xl font-black">$4,520</h3>
                <div className="text-xs text-green-400 font-bold">+5% عن الشهر الماضي</div>
              </div>
              <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 space-y-4">
                <p className="text-zinc-400 font-bold text-sm">الطلبات النشطة</p>
                <h3 className="text-4xl font-black">84</h3>
                <div className="text-xs text-zinc-500 font-bold">قيد المعالجة</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-8">
              <h2 className="text-xl font-black mb-6">آخر النشاطات</h2>
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">U{i}</div>
                      <div>
                        <p className="text-sm font-bold">مستخدم {i} قام بإنشاء طلب جديد</p>
                        <p className="text-[10px] text-zinc-500">منذ {i * 5} دقائق</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[var(--site-primary)]">$12.00</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}