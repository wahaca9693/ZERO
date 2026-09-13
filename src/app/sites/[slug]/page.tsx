import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Zap, Globe, ArrowRight } from "lucide-react";

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

export default async function SiteRootPage({ params }: Props) {
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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-10 w-auto object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-[var(--site-primary)] flex items-center justify-center font-black text-black">
                {siteName[0]}
              </div>
            )}
            <span className="text-xl font-black tracking-tight">{siteName}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/sites/${slug}/login`} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">
              تسجيل الدخول
            </Link>
            <Link href={`/sites/${slug}/login`} className="rounded-xl bg-[var(--site-primary)] px-5 py-2.5 text-sm font-black text-black hover:brightness-110 transition-all">
              ابدأ الآن
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--site-primary)]/20 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-zinc-400">
            <span className="flex h-2 w-2 rounded-full bg-[var(--site-primary)] animate-pulse" />
            المنصة الرسمية لخدمات {siteName}
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-tight">
            ارتقِ بتواجدك الرقمي <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--site-primary)] to-[var(--site-secondary)]">
              بأقوى الخدمات والحلول
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            نقدم لك مجموعة متكاملة من الخدمات الرقمية التي تضمن لك النمو والانتشار، كل ذلك من خلال واجهة سهلة الاستخدام ونظام دفع آمن وسريع.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href={`/sites/${slug}/login`} className="group rounded-2xl bg-[var(--site-primary)] px-8 py-4 text-lg font-black text-black hover:scale-105 transition-all flex items-center gap-2">
              ابدأ رحلتك الآن <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="#features" className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-bold text-white hover:bg-white/10 transition-all">
              اكتشف الخدمات
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-black">لماذا تختار {siteName}؟</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">نحن لا نقدم مجرد خدمات، بل نوفر حلولاً ذكية تسرع من عملية نموك في العالم الرقمي.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Zap className="text-[var(--site-primary)]" />, title: "سرعة فائقة", desc: "تنفيذ فوري لجميع الطلبات بفضل أنظمة الأتمتة المتقدمة." },
            { icon: <ShieldCheck className="text-[var(--site-primary)]" />, title: "أمان وموثوقية", desc: "نظام حماية متكامل يضمن خصوصية بياناتك وأمان عملياتك المالية." },
            { icon: <CheckCircle2 className="text-[var(--site-primary)]" />, title: "جودة مضمونة", desc: "نلتزم بأعلى معايير الجودة لضمان تحقيق أفضل النتائج لعملائنا." },
            { icon: <Globe className="text-[var(--site-primary)]" />, title: "دعم عالمي", desc: "خدمات تغطي كافة المنصات العالمية وبأسعار تنافسية للغاية." },
            { icon: <Zap className="text-[var(--site-primary)]" />, title: "دعم فني 24/7", desc: "فريق متخصص جاهز للرد على استفساراتك وحل مشاكلك في أي وقت." },
            { icon: <ShieldCheck className="text-[var(--site-primary)]" />, title: "دفع مرن", desc: "تعدد في خيارات الدفع لتناسب جميع المستخدمين في كافة المناطق." },
          ].map((feature, i) => (
            <div key={i} className="group rounded-3xl border border-white/5 bg-white/[0.02] p-8 hover:bg-white/[0.05] transition-all hover:-translate-y-2">
              <div className="mb-5 h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="mb-3 text-xl font-black">{feature.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-[var(--site-primary)] flex items-center justify-center font-black text-black text-xs">
                {siteName[0]}
              </div>
            )}
            <span className="font-black">{siteName}</span>
          </div>
          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} {siteName}. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}