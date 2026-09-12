"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import { CheckCircle2, ExternalLink, Globe2, Loader2, LockKeyhole, Plus, Save, Trash2, Users, Wrench, ShoppingBag, CreditCard } from "lucide-react";

type PaymentMethod = { name: string; instructions: string; enabled: boolean };
type Site = { id: number; slug: string; displayName: string; status: string; subscriptionStatus: string; subscriptionPrice: number; subscriptionCurrency: string; nextBillingAt: string | null; publicUrl: string; theme: { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string }; paymentMethods: PaymentMethod[]; providerAccessEnabled: boolean; customers: number };
type Section = "overview" | "users" | "services" | "orders" | "payments" | "settings";

const navigation: Array<{ id: Section; title: string; description: string; icon: typeof Users }> = [
  { id: "overview", title: "الرئيسية", description: "إحصاءات موقعك", icon: Globe2 },
  { id: "users", title: "المستخدمون", description: "عملاء موقعك", icon: Users },
  { id: "services", title: "الخدمات", description: "خدمات المنصة", icon: Wrench },
  { id: "orders", title: "الطلبات", description: "طلبات العملاء", icon: ShoppingBag },
  { id: "payments", title: "الدفع", description: "طرق الدفع", icon: CreditCard },
  { id: "settings", title: "الإعدادات", description: "هوية الموقع", icon: Save },
];

export default function SiteManagementPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get("site") || "";
  const requestedSection = searchParams.get("section") as Section | null;
  const section: Section = navigation.some((item) => item.id === requestedSection) ? requestedSection as Section : "overview";
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/reseller/site?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (!data.site) throw new Error(data.error || "الموقع غير موجود"); setSite(data.site); })
      .catch((error: unknown) => setMessage({ text: error instanceof Error ? error.message : "تعذر تحميل الموقع", error: true }))
      .finally(() => setLoading(false));
  }, [slug]);

  const navigate = (next: Section) => router.push(`/site-management?site=${encodeURIComponent(slug)}&section=${next}`);
  const updateTheme = (key: "primaryColor" | "secondaryColor" | "siteName" | "logoUrl", value: string) => setSite((previous) => previous ? { ...previous, theme: { ...previous.theme, [key]: value } } : previous);
  const updatePayment = (index: number, key: keyof PaymentMethod, value: string | boolean) => setSite((previous) => previous ? { ...previous, paymentMethods: previous.paymentMethods.map((method, methodIndex) => methodIndex === index ? { ...method, [key]: value } : method) } : previous);
  const save = async () => {
    if (!site) return;
    setSaving(true); setMessage(null);
    try {
      const response = await fetch("/api/reseller/site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: site.slug, theme: site.theme, paymentMethods: site.paymentMethods }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر الحفظ");
      setMessage({ text: "تم حفظ إعدادات موقعك." });
    } catch (error: unknown) { setMessage({ text: error instanceof Error ? error.message : "تعذر الحفظ", error: true }); } finally { setSaving(false); }
  };

  if (!slug) return <DashboardLayout><div dir="rtl" className="rounded-2xl bg-[var(--color-card)] p-5 text-center font-bold text-zinc-300">افتح موقعًا من صفحة لوحاتي أولًا.</div></DashboardLayout>;
  if (loading) return <DashboardLayout><div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ تحميل لوحة الموقع...</div></DashboardLayout>;
  if (!site) return <DashboardLayout><div dir="rtl" className="rounded-2xl bg-red-500/10 p-5 text-center font-bold text-red-300">{message?.text || "الموقع غير موجود."}<button onClick={() => router.push("/reseller")} className="mt-4 block w-full rounded-xl bg-[var(--color-primary)] py-3 font-black text-black">العودة إلى لوحاتي</button></div></DashboardLayout>;

  const primary = site.theme.primaryColor || "#f97316";
  const secondary = site.theme.secondaryColor || "#fbbf24";
  const expired = site.status === "expired";
  const disabled = expired;
  const panelClass = "rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5";

  const renderPayments = () => <section className={panelClass}><div className="mb-3 flex items-center justify-between"><div><h2 className="text-xl font-black text-white">طرق الدفع</h2><p className="text-sm text-zinc-500">أضف طرق الدفع التي ستظهر لعملاء موقعك.</p></div><button type="button" disabled={disabled} onClick={() => setSite((previous) => previous ? { ...previous, paymentMethods: [...previous.paymentMethods, { name: "", instructions: "", enabled: true }] } : previous)} className="flex items-center gap-1 rounded-xl bg-[var(--site-primary)]/15 px-3 py-2 text-xs font-black text-[var(--site-primary)] disabled:opacity-40"><Plus size={16} /> إضافة</button></div><div className="space-y-3">{site.paymentMethods.length === 0 && <div className="rounded-xl bg-[var(--color-surface)] p-4 text-sm text-zinc-500">لم تُضف طرق دفع بعد.</div>}{site.paymentMethods.map((method, index) => <div key={index} className="grid gap-2 rounded-xl bg-[var(--color-surface)] p-3 sm:grid-cols-[1fr_1.5fr_auto_auto]"><input disabled={disabled} value={method.name} onChange={(event) => updatePayment(index, "name", event.target.value)} placeholder="اسم الطريقة" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-white outline-none disabled:opacity-50" /><input disabled={disabled} value={method.instructions} onChange={(event) => updatePayment(index, "instructions", event.target.value)} placeholder="التعليمات أو رقم الحساب" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-white outline-none disabled:opacity-50" /><label className="flex items-center gap-1 text-xs text-zinc-300"><input disabled={disabled} type="checkbox" checked={method.enabled} onChange={(event) => updatePayment(index, "enabled", event.target.checked)} /> مفعلة</label><button disabled={disabled} type="button" onClick={() => setSite((previous) => previous ? { ...previous, paymentMethods: previous.paymentMethods.filter((_, methodIndex) => methodIndex !== index) } : previous)} className="rounded-lg bg-red-500/10 px-2 text-red-300 disabled:opacity-40"><Trash2 size={16} /></button></div>)}</div></section>;

  const renderSettings = () => <section className={panelClass}><h2 className="mb-1 text-xl font-black text-white">هوية الموقع</h2><p className="mb-4 text-sm text-zinc-500">القالب موحد مثل المنصة الرسمية، وهذه التخصيصات تخص موقعك فقط.</p><div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] p-3 text-sm font-bold text-zinc-300">اللون الأساسي<input disabled={disabled} type="color" value={primary} onChange={(event) => updateTheme("primaryColor", event.target.value)} /></label><label className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] p-3 text-sm font-bold text-zinc-300">اللون الثانوي<input disabled={disabled} type="color" value={secondary} onChange={(event) => updateTheme("secondaryColor", event.target.value)} /></label></div><div className="mt-4 grid gap-3"><label className="block text-sm font-bold text-zinc-300">اسم المنصة الخاص بك<input disabled={disabled} type="text" placeholder="مثال: Trendcom Iraq" value={site.theme.siteName || ""} onChange={(event) => updateTheme("siteName", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-white outline-none" /></label><label className="block text-sm font-bold text-zinc-300">رابط الشعار (Logo URL)<input disabled={disabled} type="text" placeholder="https://example.com/logo.png" value={site.theme.logoUrl || ""} onChange={(event) => updateTheme("logoUrl", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-white outline-none" dir="ltr" /><p className="mt-1 text-xs text-zinc-500">انسخ رابط صورة الشعار (يُفضل بصيغة PNG شفافة).</p></label></div></section>;

  const renderSection = () => {
    if (section === "payments") return renderPayments();
    if (section === "settings") return renderSettings();
    if (section === "users") return <section className={panelClass}><Users className="mb-3 text-[var(--site-primary)]" size={28} /><h2 className="text-xl font-black text-white">مستخدمو موقعك</h2><p className="mt-2 leading-7 text-zinc-400">عدد المستخدمين الحالي: <strong className="text-white">{site.customers}</strong>. هذه المساحة مخصصة لإدارة عملاء موقعك فقط، ولا تعرض مستخدمي Trendcom الرسميين.</p><div className="mt-4 rounded-xl bg-amber-500/10 p-4 text-sm font-bold text-amber-200">سيتم تفعيل إدارة الأرصدة والطلبات الخاصة بعملاء الفرع ضمن مساحة الموقع المعزولة.</div></section>;
    if (section === "services") return <section className={panelClass}><Wrench className="mb-3 text-[var(--site-primary)]" size={28} /><h2 className="text-xl font-black text-white">خدمات موقعك</h2><p className="mt-2 leading-7 text-zinc-400">يمكن لمالك الموقع إدارة الخدمات المسموح بها من كتالوج المنصة الرسمية.</p><div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4"><div className="flex items-center gap-2 font-black text-red-200"><LockKeyhole size={18} /> إضافة المزودين مقفولة</div><p className="mt-2 text-sm leading-6 text-red-100/70">لا يُسمح لك بإضافة مزودين خارجيين. هذه الصلاحية متاحة للـAdmin الرسمي فقط.</p></div></section>;
    if (section === "orders") return <section className={panelClass}><ShoppingBag className="mb-3 text-[var(--site-primary)]" size={28} /><h2 className="text-xl font-black text-white">طلبات الموقع</h2><p className="mt-2 leading-7 text-zinc-400">ستظهر هنا طلبات مستخدمي فرعك مع حالات التنفيذ والرصيد الخاص بالفرع، دون خلطها بطلبات المنصة الرسمية.</p></section>;
    return <><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className={panelClass}><span className="text-xs text-zinc-500">حالة الموقع</span><div className={`mt-2 font-black ${expired ? "text-amber-300" : "text-emerald-400"}`}>{expired ? "مجمّد لانتهاء الاشتراك" : "نشط"}</div></div><div className={panelClass}><span className="text-xs text-zinc-500">المشتركون</span><div className="mt-2 font-black text-white">{site.customers}</div></div><div className={panelClass}><span className="text-xs text-zinc-500">السعر الشهري</span><div className="mt-2 font-black text-white">{site.subscriptionPrice.toFixed(2)} {site.subscriptionCurrency}</div></div><div className={panelClass}><span className="text-xs text-zinc-500">التجديد/الانتهاء</span><div className="mt-2 font-black text-white">{site.nextBillingAt ? new Date(site.nextBillingAt).toLocaleDateString("ar-IQ") : "—"}</div></div></section><section className={panelClass}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-white">الرابط العام</h2><p className="mt-1 break-all text-sm text-zinc-400">{site.publicUrl}</p></div><a href={site.publicUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-[var(--site-primary)] px-4 py-2 text-sm font-black text-black">فتح الموقع <ExternalLink size={16} /></a></div></section></>;
  };

  return <DashboardLayout><div dir="rtl" className="mx-auto max-w-5xl space-y-4 pb-10" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}><section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--site-primary)] to-[var(--site-secondary)] p-6 text-black"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black opacity-70">نسخة إدارة مستقلة من Trendcom</p><h1 className="mt-1 text-3xl font-black">{site.displayName}</h1><p className="mt-2 break-all text-sm font-bold opacity-75">{site.publicUrl}</p></div><Globe2 size={34} /></div></section>{expired && <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm font-bold text-amber-100">انتهت مدة الاشتراك. تم تجميد الموقع وتعديلاته حتى التجديد.</div>}<nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{navigation.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`rounded-2xl border p-3 text-right transition ${section === item.id ? "border-[var(--site-primary)] bg-[var(--site-primary)]/15" : "border-[var(--color-border)] bg-[var(--color-card)]"}`}><Icon className="mb-2 text-[var(--site-primary)]" size={20} /><div className="text-sm font-black text-white">{item.title}</div><div className="mt-1 text-[10px] text-zinc-500">{item.description}</div></button>; })}</nav>{renderSection()}{section === "payments" || section === "settings" ? <button type="button" onClick={save} disabled={saving || disabled} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--site-primary)] py-3.5 font-black text-black disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} حفظ إعدادات الموقع</button> : null}{message && <div className={`rounded-xl p-3 text-sm font-bold ${message.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{message.text}</div>}<div className="flex items-center gap-2 text-xs text-zinc-500"><CheckCircle2 size={15} className="text-emerald-400" /> هذه لوحة موقعك فقط. لا يمكنها تعديل إعدادات Trendcom الرسمية أو إضافة مزودين.</div></div></DashboardLayout>;
}
