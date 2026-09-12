import { notFound } from "next/navigation";
import Link from "next/link";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";

type PageProps = { params: Promise<{ slug: string }> };
type PaymentMethod = { name?: string; instructions?: string; enabled?: boolean };

export default async function PublicResellerSite({ params }: PageProps) {
  await initDb();
  const { slug } = await params;
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://cxxv.vercel.app";
  const site = publicSiteData(loaded.site, origin, loaded.expired);
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string };
  const methods = Array.isArray(site.paymentMethods) ? site.paymentMethods as PaymentMethod[] : [];
  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const expired = loaded.expired || site.status === "expired";

  return <main dir="rtl" className="min-h-screen bg-[#0b0b09] text-white" style={{ background: "radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--site-primary) 18%, transparent), transparent 35%), #0b0b09", "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-8 flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur sm:px-7">
        <div><p className="text-xs font-bold text-[var(--site-primary)]">موقع فرعي مستقل</p><h1 className="mt-1 text-xl font-black sm:text-2xl">{site.displayName}</h1><p className="mt-1 text-xs text-zinc-500">{site.publicUrl}</p></div>
        <div className="rounded-2xl bg-gradient-to-br from-[var(--site-primary)] to-[var(--site-secondary)] px-4 py-3 text-center text-black"><div className="text-[10px] font-black">اشتراك شهري</div><div className="text-lg font-black">{site.subscriptionPrice.toFixed(2)} {site.subscriptionCurrency}</div></div>
      </header>
      {expired ? <section className="rounded-[2rem] border border-amber-400/30 bg-amber-400/10 p-8 text-center shadow-2xl"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-3xl">!</div><h2 className="text-2xl font-black text-amber-200">هذا الموقع متوقف مؤقتًا</h2><p className="mx-auto mt-3 max-w-xl leading-8 text-amber-100/75">انتهت مدة الاشتراك الشهري في {site.nextBillingAt ? new Date(String(site.nextBillingAt)).toLocaleDateString("ar-IQ") : "التاريخ المحدد"}. ستبقى بيانات الموقع محفوظة، ويحتاج المالك إلى تجديد الاشتراك لإعادة تشغيله.</p></section> : <><section className="rounded-[2rem] bg-gradient-to-br from-[var(--site-primary)] to-[var(--site-secondary)] p-7 text-black shadow-[0_24px_70px_-30px_var(--site-primary)] sm:p-10"><p className="text-sm font-black opacity-70">مرحبًا بك في</p><h2 className="mt-2 text-3xl font-black sm:text-5xl">{site.displayName}</h2><p className="mt-4 max-w-2xl text-base font-bold leading-8 opacity-80">خدمات رقمية مرتبة وسهلة الاستخدام عبر موقع مستقل.</p><div className="mt-6 flex flex-wrap gap-3"><Link href={`/sites/${encodeURIComponent(slug)}/login`} className="rounded-2xl bg-black px-5 py-3 font-black text-white">تسجيل الدخول</Link><Link href={`/sites/${encodeURIComponent(slug)}/login?mode=register`} className="rounded-2xl border-2 border-black/20 px-5 py-3 font-black text-black">إنشاء حساب</Link></div></section><section className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h3 className="text-xl font-black">الخدمات</h3><p className="mt-3 leading-7 text-zinc-400">ستظهر خدمات هذا الموقع هنا بعد إعدادها من لوحة المالك.</p></div><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h3 className="text-xl font-black">طرق الدفع</h3>{methods.filter((method) => method.enabled !== false).length === 0 ? <p className="mt-3 leading-7 text-zinc-400">لم تتم إضافة طرق دفع بعد.</p> : <div className="mt-3 space-y-2">{methods.filter((method) => method.enabled !== false).map((method, index) => <div key={`${method.name}-${index}`} className="rounded-2xl bg-black/20 p-3"><div className="font-bold text-zinc-200">{method.name}</div><div className="mt-1 text-sm text-zinc-500">{method.instructions || "تواصل مع إدارة الموقع"}</div></div>)}</div>}</div></section></>}
      <footer className="mt-8 text-center text-xs text-zinc-600">هذا الموقع يعمل ضمن البنية المستقلة للموقع الفرعي.</footer>
    </div>
  </main>;
}
