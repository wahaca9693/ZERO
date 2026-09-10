"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useTheme } from "../components/ThemeProvider";
import { ChevronDown, CheckCircle2, CircleHelp, Globe2, ListChecks, Loader2, Plus, WalletCards, XCircle } from "lucide-react";

type FaqItem = { q: string; a: string };
type SiteSettings = {
  enabled: boolean;
  monthlyPrice: number;
  currency: string;
  title: string;
  description: string;
  features: string[];
  terms: string[];
  faq: FaqItem[];
  primaryColor: string;
  secondaryColor: string;
};
type RequestItem = { id: number; site_name: string; status: string; created_at: string };

const fallbackSettings: SiteSettings = {
  enabled: true,
  monthlyPrice: 2,
  currency: "USD",
  title: "أنشئ موقعك الخاص",
  description: "احصل على لوحة خدمات خاصة بك وابدأ بيع الخدمات وكسب العمولة.",
  features: ["تصميم احترافي قابل للتخصيص", "ربط تلقائي بالخدمات والأسعار", "نظام مستخدمين ورصيد كامل", "لوحة تحكم مستقلة"],
  terms: ["اسم الفرع يجب أن يكون فريدًا ومتاحًا.", "يُخصم الاشتراك الشهري بعد تأكيد إنشاء الموقع.", "إضافة مزودين خارجيين قد تتطلب تفعيلًا مدفوعًا.", "يحق للإدارة إيقاف الموقع عند مخالفة الشروط."],
  faq: [{ q: "ما هو الموقع الفرعي؟", a: "مساحة مستقلة باسمك داخل منصة Trendcom لإدارة الخدمات والمستخدمين." }],
  primaryColor: "#f97316",
  secondaryColor: "#fbbf24",
};

function statusLabel(status: string) {
  if (status === "approved") return "تمت الموافقة";
  if (status === "rejected") return "مرفوض";
  return "قيد المراجعة";
}

export default function ResellerPage() {
  const { settings: platformSettings } = useTheme();
  const brandName = platformSettings.siteName || "Trendcom";
  const [settings, setSettings] = useState<SiteSettings>(fallbackSettings);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [siteName, setSiteName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/reseller", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/user", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([reseller, userData]) => {
      if (!active) return;
      if (reseller.settings) setSettings({ ...fallbackSettings, ...reseller.settings });
      if (Array.isArray(reseller.requests)) setRequests(reseller.requests);
      if (userData.user) setBalance(Number(userData.user.balance || 0));
    }).catch(() => {
      if (active) setMessage({ text: "تعذر تحميل إعدادات المواقع الآن.", error: true });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const priceText = useMemo(() => `${settings.monthlyPrice.toFixed(2)} ${settings.currency}`, [settings.monthlyPrice, settings.currency]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!siteName.trim() || !contact.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/reseller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_name: siteName, contact, notes }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "تعذر إرسال الطلب");
      setMessage({ text: data.message || "تم استلام طلبك بنجاح." });
      if (data.request) setRequests((previous) => [data.request, ...previous]);
      setSiteName(""); setContact(""); setNotes("");
    } catch (error: unknown) {
      setMessage({ text: error instanceof Error ? error.message : "تعذر إرسال الطلب", error: true });
    } finally { setSubmitting(false); }
  };

  return (
    <DashboardLayout>
      <div dir="rtl" className="mx-auto max-w-3xl space-y-4 pb-8" style={{ "--reseller-primary": settings.primaryColor, "--reseller-secondary": settings.secondaryColor } as React.CSSProperties}>
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--reseller-primary)] to-[var(--reseller-secondary)] p-5 text-black shadow-[0_18px_50px_-24px_var(--reseller-primary)] sm:p-7">
          <div className="absolute -left-12 -top-14 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-black opacity-70">{brandName} · مساحتك الخاصة</p>
              <h1 className="text-2xl font-black sm:text-3xl">{settings.title}</h1>
              <p className="mt-2 max-w-xl text-sm font-bold leading-7 opacity-80">{settings.description}</p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/10"><Globe2 size={30} /></span>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <div className="flex items-center justify-between"><span className="text-sm font-bold text-zinc-400">رصيدك</span><WalletCards className="text-[var(--reseller-primary)]" size={23} /></div>
            <div className="mt-3 text-2xl font-black text-white">${balance === null ? "—" : balance.toFixed(4)}</div>
            <p className="mt-1 text-xs text-zinc-500">يُستخدم للاشتراك بعد تأكيد الإنشاء.</p>
          </div>
          <div className="rounded-3xl border border-[var(--color-border)] bg-black p-5">
            <div className="flex items-center justify-between"><span className="text-sm font-bold text-zinc-400">سعر الاشتراك</span><span className="rounded-xl bg-[var(--reseller-primary)]/20 px-3 py-2 text-[var(--reseller-primary)]">شهري</span></div>
            <div className="mt-3 text-2xl font-black text-white">{priceText}</div>
            <p className="mt-1 text-xs text-zinc-500">السعر يحدده Admin ويظهر قبل الإرسال.</p>
          </div>
        </section>

        <button type="button" onClick={() => document.getElementById("new-site")?.scrollIntoView({ behavior: "smooth" })} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--reseller-primary)] to-[var(--reseller-secondary)] py-4 text-base font-black text-black shadow-lg transition active:scale-[.98]"><Plus size={21} /> إنشاء موقع جديد</button>

        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2"><ListChecks className="text-[var(--reseller-primary)]" size={23} /><h2 className="text-xl font-black text-white">مميزات الموقع</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">{settings.features.map((feature) => <div key={feature} className="flex items-start gap-2 text-sm font-bold leading-6 text-zinc-300"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} />{feature}</div>)}</div>
        </section>

        <section id="new-site" className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
          <div className="mb-5"><h2 className="text-xl font-black text-white">طلب إنشاء موقع جديد</h2><p className="mt-1 text-xs leading-6 text-zinc-500">في هذه المرحلة يُسجل الطلب للمراجعة فقط؛ لا يتم خصم الرصيد تلقائيًا حتى تكتمل طبقة الإنشاء والعزل الآمن.</p></div>
          {!settings.enabled ? <div className="rounded-2xl bg-red-500/10 p-4 text-sm font-bold text-red-300">إنشاء المواقع متوقف مؤقتًا من الإدارة.</div> : <form onSubmit={submit} className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-300">اسم الفرع أو الموقع</span><input value={siteName} onChange={(event) => setSiteName(event.target.value)} maxLength={80} required placeholder="مثال: my-store" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-white outline-none transition focus:border-[var(--reseller-primary)]" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-300">طريقة التواصل</span><input value={contact} onChange={(event) => setContact(event.target.value)} maxLength={180} required placeholder="واتساب / تيليجرام / بريد" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-white outline-none transition focus:border-[var(--reseller-primary)]" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-300">ملاحظات إضافية</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} placeholder="اكتب الشكل أو الاسم الذي تريده" className="w-full resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-white outline-none transition focus:border-[var(--reseller-primary)]" /></label>
            {message && <div className={`flex items-start gap-2 rounded-2xl p-3 text-sm font-bold ${message.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{message.error ? <XCircle size={18} /> : <CheckCircle2 size={18} />}{message.text}</div>}
            <button type="submit" disabled={submitting || loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--reseller-primary)] to-[var(--reseller-secondary)] py-3.5 font-black text-black disabled:opacity-50">{submitting ? <><Loader2 className="animate-spin" size={18} /> جارٍ الإرسال...</> : <><Plus size={18} /> إرسال طلب الإنشاء</>}</button>
          </form>}
        </section>

        {requests.length > 0 && <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"><h2 className="mb-3 text-lg font-black text-white">طلباتك السابقة</h2><div className="space-y-2">{requests.map((request) => <div key={request.id} className="flex items-center justify-between rounded-2xl bg-[var(--color-surface)] px-4 py-3"><span className="font-bold text-zinc-200">{request.site_name}</span><span className="text-xs font-bold text-zinc-400">{statusLabel(request.status)}</span></div>)}</div></section>}

        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6"><div className="mb-3 flex items-center gap-2"><CircleHelp className="text-[var(--reseller-primary)]" size={22} /><h2 className="text-xl font-black text-white">الشروط والأسئلة الشائعة</h2></div><div className="mb-5 space-y-2">{settings.terms.map((term) => <div key={term} className="flex items-start gap-2 text-sm leading-6 text-zinc-300"><CheckCircle2 className="mt-1 shrink-0 text-emerald-400" size={16} />{term}</div>)}</div><div className="space-y-2">{settings.faq.map((item, index) => <div key={`${item.q}-${index}`} className="overflow-hidden rounded-2xl bg-[var(--color-surface)]"><button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right font-bold text-zinc-200"><span>{item.q}</span><ChevronDown size={18} className={`transition ${openFaq === index ? "rotate-180 text-[var(--reseller-primary)]" : "text-zinc-500"}`} /></button>{openFaq === index && <p className="border-t border-white/5 px-4 py-3 text-sm leading-6 text-zinc-400">{item.a}</p>}</div>)}</div></section>
      </div>
    </DashboardLayout>
  );
}
