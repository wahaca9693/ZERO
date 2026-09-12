"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useTheme } from "../components/ThemeProvider";
import { CheckCircle2, CircleHelp, ChevronDown, Globe2, ListChecks, Loader2, Plus, WalletCards, XCircle, ExternalLink } from "lucide-react";

type FaqItem = { q: string; a: string };
type SiteSettings = { enabled: boolean; monthlyPrice: number; currency: string; title: string; description: string; features: string[]; terms: string[]; faq: FaqItem[]; primaryColor: string; secondaryColor: string };
type SiteItem = { id: number; slug: string; displayName: string; status: string; subscriptionStatus: string; subscriptionPrice: number; subscriptionCurrency: string; nextBillingAt: string | null; publicUrl: string; createdAt: string | null; providerAccessEnabled: boolean };
const fallbackSettings: SiteSettings = { enabled: true, monthlyPrice: 2, currency: "USD", title: "أنشئ موقعك الخاص", description: "احصل على لوحة خدمات خاصة بك وابدأ بيع الخدمات وكسب العمولة.", features: ["تصميم احترافي قابل للتخصيص", "ربط تلقائي بالخدمات والأسعار", "نظام مستخدمين ورصيد كامل", "لوحة تحكم مستقلة"], terms: ["اسم الفرع يجب أن يكون فريدًا ومتاحًا.", "يُخصم الاشتراك الشهري بعد تأكيد إنشاء الموقع.", "إضافة مزودين خارجيين قد تتطلب تفعيلًا مدفوعًا.", "يحق للإدارة إيقاف الموقع عند مخالفة الشروط."], faq: [{ q: "ما هو الموقع الفرعي؟", a: "مساحة مستقلة باسمك داخل منصة Trendcom لإدارة الخدمات والمستخدمين." }], primaryColor: "#f97316", secondaryColor: "#fbbf24" };

function siteStatus(status: string) { return status === "active" ? "نشط" : status === "suspended" ? "موقوف" : status; }
function makeCreationKey() { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID().replaceAll("-", ""); return `${Date.now()}_${Math.random().toString(36).slice(2)}`; }

export default function ResellerPage() {
  const { settings: platformSettings } = useTheme();
  const brandName = platformSettings.siteName || "Trendcom";
  const [settings, setSettings] = useState<SiteSettings>(fallbackSettings);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const priceText = useMemo(() => `${settings.monthlyPrice.toFixed(2)} ${settings.currency}`, [settings.monthlyPrice, settings.currency]);

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/reseller", { cache: "no-store" }).then((response) => response.json()), fetch("/api/user", { cache: "no-store" }).then((response) => response.json())]).then(([data, userData]) => {
      if (!active) return;
      if (data.settings) setSettings({ ...fallbackSettings, ...data.settings });
      if (Array.isArray(data.sites)) setSites(data.sites);
      if (userData.user) setBalance(Number(userData.user.balance || 0));
    }).catch(() => { if (active) setMessage({ text: "تعذر تحميل إعدادات المواقع الآن.", error: true }); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const normalized = slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/.test(normalized)) return;
    const timer = window.setTimeout(async () => {
      setChecking(true);
      try { const response = await fetch(`/api/reseller?action=check-name&slug=${encodeURIComponent(normalized)}`, { cache: "no-store" }); const data = await response.json(); setAvailable(response.ok && data.available === true); } finally { setChecking(false); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [slug]);

  const createSite = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (available !== true || !displayName.trim()) { setMessage({ text: "اختر اسمًا متاحًا واكتب اسم الموقع أولًا.", error: true }); return; }
    setCreating(true); setMessage(null);
    try {
      const response = await fetch("/api/reseller", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": makeCreationKey() }, body: JSON.stringify({ action: "create", slug: normalized, display_name: displayName.trim(), admin_username: adminUsername.trim().toLowerCase(), admin_email: adminEmail.trim().toLowerCase(), admin_password: adminPassword, creation_key: makeCreationKey() }) });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "تعذر إنشاء الموقع");
      if (data.site) setSites((previous) => [data.site, ...previous.filter((site) => site.id !== data.site.id)]);
      if (typeof data.charged === "number") setBalance((previous) => previous === null ? previous : previous - data.charged);
      setMessage({ text: `تم إنشاء موقعك تلقائيًا باسم ${data.site.displayName}.` });
      window.location.assign(data.dashboardUrl || `/site-management?site=${encodeURIComponent(normalized)}`);
    } catch (error: unknown) { setMessage({ text: error instanceof Error ? error.message : "تعذر إنشاء الموقع", error: true }); } finally { setCreating(false); }
  };

  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-3xl space-y-4 pb-8" style={{ "--reseller-primary": settings.primaryColor, "--reseller-secondary": settings.secondaryColor } as React.CSSProperties}>
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--reseller-primary)] to-[var(--reseller-secondary)] p-5 text-black shadow-[0_18px_50px_-24px_var(--reseller-primary)] sm:p-7"><div className="absolute -left-12 -top-14 h-40 w-40 rounded-full bg-white/15 blur-2xl" /><div className="relative flex items-start justify-between gap-4"><div><p className="mb-2 text-xs font-black opacity-70">{brandName} · مساحتك الخاصة</p><h1 className="text-2xl font-black sm:text-3xl">{settings.title}</h1><p className="mt-2 max-w-xl text-sm font-bold leading-7 opacity-80">{settings.description}</p></div><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/10"><Globe2 size={30} /></span></div></section>
    <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"><div className="flex items-center justify-between"><span className="text-sm font-bold text-zinc-400">رصيدك</span><WalletCards className="text-[var(--reseller-primary)]" size={23} /></div><div className="mt-3 text-2xl font-black text-white">${balance === null ? "—" : balance.toFixed(4)}</div><p className="mt-1 text-xs text-zinc-500">يُخصم الاشتراك عند الإنشاء المباشر.</p></div><div className="rounded-3xl border border-[var(--color-border)] bg-black p-5"><div className="flex items-center justify-between"><span className="text-sm font-bold text-zinc-400">سعر الاشتراك</span><span className="rounded-xl bg-[var(--reseller-primary)]/20 px-3 py-2 text-[var(--reseller-primary)]">شهري</span></div><div className="mt-3 text-2xl font-black text-white">{priceText}</div><p className="mt-1 text-xs text-zinc-500">يُطبق مرة واحدة عند إنشاء الموقع.</p></div></section>
    <button type="button" onClick={() => document.getElementById("new-site")?.scrollIntoView({ behavior: "smooth" })} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--reseller-primary)] to-[var(--reseller-secondary)] py-4 text-base font-black text-black shadow-lg transition active:scale-[.98]"><Plus size={21} /> إنشاء موقع جديد الآن</button>
    <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><ListChecks className="text-[var(--reseller-primary)]" size={23} /><h2 className="text-xl font-black text-white">مميزات الموقع</h2></div><div className="grid gap-3 sm:grid-cols-2">{settings.features.map((feature) => <div key={feature} className="flex items-start gap-2 text-sm font-bold leading-6 text-zinc-300"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} />{feature}</div>)}</div></section>
    <section id="new-site" className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6"><div className="mb-5"><h2 className="text-xl font-black text-white">إنشاء موقع جديد مباشرة</h2><p className="mt-1 text-xs leading-6 text-zinc-500">اكتب اسم الفرع، تحقق من توفره، ثم أنشئ موقعك فورًا بالقالب الموحد. بعد الإنشاء تفتح لك لوحة مستقلة لتخصيص الدفع والخدمات والألوان.</p></div>{!settings.enabled ? <div className="rounded-2xl bg-red-500/10 p-4 text-sm font-bold text-red-300">إنشاء المواقع متوقف مؤقتًا من الإدارة.</div> : <form onSubmit={createSite} className="space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-300">اسم الفرع الفريد</span><input value={slug} onChange={(event) => { setSlug(event.target.value); setAvailable(null); }} maxLength={32} required placeholder="مثال: my-store" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-left text-white outline-none transition focus:border-[var(--reseller-primary)]" />{slug && <span className={`mt-2 block text-xs font-bold ${checking ? "text-zinc-400" : available === true ? "text-emerald-400" : available === false ? "text-red-300" : "text-zinc-500"}`}>{checking ? "جارٍ فحص التوفر..." : available === true ? "الاسم متاح ويمكن إنشاؤه" : available === false ? "الاسم غير متاح أو غير صالح" : "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطة فقط"}</span>}</label><label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-300">اسم الموقع الظاهر</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} required placeholder="مثال: متجري للخدمات" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-white outline-none transition focus:border-[var(--reseller-primary)]" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-300">اسم مستخدم Admin الفرع</span><input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value.toLowerCase())} maxLength={32} required placeholder="مثال: myadmin" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-left text-white outline-none transition focus:border-[var(--reseller-primary)]" /></label><label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-300">بريد Admin الفرع</span><input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required placeholder="admin@example.com" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-left text-white outline-none transition focus:border-[var(--reseller-primary)]" /></label></div><label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-300">كلمة مرور Admin الفرع</span><input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} minLength={8} required placeholder="8 أحرف على الأقل مع حروف وأرقام" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-left text-white outline-none transition focus:border-[var(--reseller-primary)]" /></label><div className="rounded-2xl bg-[var(--color-surface)] p-4 text-sm leading-7 text-zinc-300">سيُنشأ رابط فرعك تلقائيًا من الاسم، وتبدأ لوحة الموقع بنفس القالب الرسمي. يخصم النظام <strong className="text-[var(--reseller-primary)]">{priceText}</strong> من رصيدك عند نجاح الإنشاء فقط.</div>{message && <div className={`flex items-start gap-2 rounded-2xl p-3 text-sm font-bold ${message.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{message.error ? <XCircle size={18} /> : <CheckCircle2 size={18} />}{message.text}</div>}<button type="submit" disabled={creating || loading || checking || available !== true} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--reseller-primary)] to-[var(--reseller-secondary)] py-3.5 font-black text-black disabled:opacity-50">{creating ? <><Loader2 className="animate-spin" size={18} /> جارٍ إنشاء موقعك...</> : <><Plus size={18} /> إنشاء الموقع وفتح اللوحة</>}</button></form>}</section>
    {sites.length > 0 && <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"><h2 className="mb-3 text-lg font-black text-white">لوحاتك ({sites.length})</h2><div className="space-y-2">{sites.map((site) => <div key={site.id} className="rounded-2xl bg-[var(--color-surface)] px-4 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-bold text-zinc-200">{site.displayName}</div><div className="mt-1 text-xs text-zinc-500">/{site.slug} · {siteStatus(site.status)}</div></div><div className={`rounded-full px-3 py-1 text-xs font-black ${site.status === "expired" ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>{site.status === "expired" ? "منتهٍ ومجمّد" : "اشتراك نشط"}</div></div><div className="mt-3 rounded-xl border border-white/5 bg-black/20 p-3"><div className="text-[11px] font-bold text-zinc-500">الرابط العام للمستخدمين</div><a href={site.publicUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-black text-[var(--reseller-primary)] underline-offset-4 hover:underline">{site.publicUrl}</a><div className="mt-2 text-xs text-zinc-400">{site.subscriptionPrice.toFixed(2)} {site.subscriptionCurrency} شهريًا · {site.nextBillingAt ? `التجديد: ${new Date(site.nextBillingAt).toLocaleDateString("ar-IQ")}` : "موعد التجديد غير محدد"}</div></div><div className="mt-3 flex flex-wrap gap-2"><a href={site.publicUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-xl bg-[var(--reseller-primary)]/15 px-3 py-2 text-xs font-black text-[var(--reseller-primary)]">فتح الموقع العام <ExternalLink size={14} /></a><a href={`/site-management?site=${encodeURIComponent(site.slug)}`} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-200">فتح اللوحة <ExternalLink size={14} /></a></div></div>)}</div></section>}
    <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6"><div className="mb-3 flex items-center gap-2"><CircleHelp className="text-[var(--reseller-primary)]" size={22} /><h2 className="text-xl font-black text-white">الشروط والأسئلة الشائعة</h2></div><div className="mb-5 space-y-2">{settings.terms.map((term) => <div key={term} className="flex items-start gap-2 text-sm leading-6 text-zinc-300"><CheckCircle2 className="mt-1 shrink-0 text-emerald-400" size={16} />{term}</div>)}</div><div className="space-y-2">{settings.faq.map((item, index) => <div key={`${item.q}-${index}`} className="overflow-hidden rounded-2xl bg-[var(--color-surface)]"><button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right font-bold text-zinc-200"><span>{item.q}</span><ChevronDown size={18} className={`transition ${openFaq === index ? "rotate-180 text-[var(--reseller-primary)]" : "text-zinc-500"}`} /></button>{openFaq === index && <p className="border-t border-white/5 px-4 py-3 text-sm leading-6 text-zinc-400">{item.a}</p>}</div>)}</div></section>
  </div></DashboardLayout>;
}
