"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { Copy, Check, ExternalLink, Globe2, Loader2, Shield, Users, ShoppingBag, Lock, Banknote, Ban, PlayCircle, KeyRound, Mail, Save } from "lucide-react";

type SiteRow = {
  id: number;
  slug: string;
  displayName: string;
  status: string;
  subscriptionStatus: string;
  subscriptionPrice: number;
  subscriptionCurrency: string;
  createdAt: string | null;
  ownerUserId: number;
  ownerUsername: string | null;
  ownerEmail: string | null;
  ownerBalance: number;
  adminUsername: string | null;
  adminEmail: string | null;
  hasPassword: boolean;
  suspendedReason: string | null;
  customers: number;
  orders: number;
  publicUrl: string;
  adminUrl: string;
};

export default function AdminSitesPage() {
  const [sites, setSites] = useState<SiteRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  // سعر إنشاء المنصة
  const [price, setPrice] = useState<string>("");
  const [savingPrice, setSavingPrice] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/sites", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "غير مصرح"); }
      else if (Array.isArray(data.sites)) setSites(data.sites);
    } catch { setError("تعذر التحميل"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  // تحميل السعر الحالي من إعدادات reseller
  useEffect(() => {
    fetch("/api/admin/reseller-settings", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.settings && typeof data.settings.monthlyPrice === "number") {
          setPrice(String(data.settings.monthlyPrice));
        }
      })
      .catch(() => undefined);
  }, []);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const savePrice = async () => {
    const value = Number(price);
    if (!Number.isFinite(value) || value < 0) { setNotice({ text: "السعر يجب أن يكون 0 أو أكبر", error: true }); return; }
    setSavingPrice(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/reseller-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_price: value }),
      });
      const data = await res.json();
      if (!res.ok) { setNotice({ text: data.error || "فشل الحفظ", error: true }); }
      else { setNotice({ text: "✅ تم حفظ سعر إنشاء المنصة بنجاح", error: false }); }
    } catch { setNotice({ text: "تعذر الحفظ", error: true }); }
    finally { setSavingPrice(false); }
  };

  const toggleSuspend = async (site: SiteRow) => {
    setBusySlug(site.slug);
    setNotice(null);
    const suspending = site.status !== "suspended";
    const reason = suspending ? (suspendReason[site.slug] || "مخالفة شروط الاستخدام") : undefined;
    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: suspending ? "suspend" : "resume", slug: site.slug, reason }),
      });
      const data = await res.json();
      if (!res.ok) { setNotice({ text: data.error || "فشل العملية", error: true }); }
      else {
        setNotice({ text: suspending ? `⛔ تم إيقاف ${site.displayName}` : `✅ تم فتح ${site.displayName}`, error: false });
        await load();
      }
    } catch { setNotice({ text: "تعذر تنفيذ العملية", error: true }); }
    finally { setBusySlug(null); }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400"><Shield size={22} /></span>
          <div>
            <h1 className="text-2xl font-black text-white">جميع المنصات الفرعية</h1>
            <p className="text-sm text-zinc-400">بيانات الأدمن، الإيقاف/الفتح، وسعر الإنشاء — للمالك الرسمي فقط</p>
          </div>
        </div>

        {notice && (
          <div className={`rounded-2xl p-4 text-sm font-bold ${notice.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
            {notice.text}
          </div>
        )}

        {error && <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

        {/* حقل سعر الإنشاء */}
        <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Banknote size={22} className="text-amber-400" />
              <div>
                <p className="font-black text-white">سعر إنشاء المنصة</p>
                <p className="text-xs text-zinc-400">حدد السعر الذي يدفعه المستخدم عند إنشاء فرع — يمكنك جعله 0 (مجاني)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-28 rounded-xl border border-white/10 bg-[#141414] px-3 py-2.5 text-center text-sm font-black text-white outline-none focus:border-amber-400"
              />
              <span className="text-sm font-bold text-zinc-400">USD</span>
              <button
                onClick={() => void savePrice()}
                disabled={savingPrice}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-black hover:brightness-110 disabled:opacity-50"
              >
                {savingPrice ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} حفظ
              </button>
            </div>
          </div>
        </div>

        {loading && <div className="flex justify-center py-16 text-zinc-500"><Loader2 className="animate-spin" size={24} /></div>}

        {!loading && sites && sites.length === 0 && (
          <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-10 text-center">
            <Globe2 className="mx-auto mb-3 text-zinc-600" size={40} />
            <p className="font-black text-white">لا توجد منصات فرعية بعد</p>
          </div>
        )}

        {!loading && sites && (
          <div className="grid gap-4 md:grid-cols-2">
            {sites.map((site) => {
              const suspended = site.status === "suspended";
              return (
                <div key={site.id} className={`rounded-3xl border p-5 ${suspended ? "border-red-500/30 bg-red-500/[0.04]" : "border-white/10 bg-white/[0.03]"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-white">{site.displayName}</p>
                      <p className="text-xs font-bold text-zinc-500" dir="ltr">{site.slug}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${!suspended ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      {!suspended ? "نشط" : "موقوف"}
                    </span>
                  </div>

                  {/* بيانات أدمن الفرع — للمالك الرسمي */}
                  <div className="mt-3 rounded-xl border border-white/5 bg-[#141414] p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-zinc-500">
                      <KeyRound size={11} /> بيانات أدمن الفرع (نسخة احتياطية للمالك)
                    </p>
                    <div className="mt-2 space-y-1 text-xs">
                      <p className="flex items-center gap-2 text-zinc-300">
                        <span className="text-zinc-500">المستخدم:</span>
                        <span className="font-bold text-amber-300" dir="ltr">{site.adminUsername || "—"}</span>
                        {site.adminUsername && (
                          <button onClick={() => copy(site.adminUsername!, `u-${site.id}`)} className="rounded bg-white/5 p-1 text-zinc-500 hover:text-white">
                            {copied === `u-${site.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        )}
                      </p>
                      <p className="flex items-center gap-2 text-zinc-300">
                        <Mail size={11} className="text-zinc-500" />
                        <span dir="ltr">{site.adminEmail || "—"}</span>
                        {site.adminEmail && (
                          <button onClick={() => copy(site.adminEmail!, `e-${site.id}`)} className="rounded bg-white/5 p-1 text-zinc-500 hover:text-white">
                            {copied === `e-${site.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        )}
                      </p>
                      <p className="text-zinc-500">
                        كلمة المرور: <span className={`font-bold ${site.hasPassword ? "text-emerald-400" : "text-red-400"}`}>{site.hasPassword ? "محفوظة ✓" : "غير مضبوطة"}</span>
                        {" · "}المالك: @{site.ownerUsername || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-zinc-400">
                    <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1"><Users size={12} /> {site.customers} عميل</span>
                    <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1"><ShoppingBag size={12} /> {site.orders} طلب</span>
                    <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1"><Banknote size={12} /> رصيد المالك: ${site.ownerBalance.toFixed(2)}</span>
                  </div>

                  {/* سبب الإيقاف إن وجد */}
                  {suspended && site.suspendedReason && (
                    <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
                      ⛔ سبب الإيقاف: <strong>{site.suspendedReason}</strong>
                    </div>
                  )}

                  {/* إيقاف/فتح + سبب */}
                  {!suspended && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        value={suspendReason[site.slug] || ""}
                        onChange={(e) => setSuspendReason((prev) => ({ ...prev, [site.slug]: e.target.value }))}
                        placeholder="سبب الإيقاف (اختياري)"
                        className="flex-1 rounded-xl border border-white/10 bg-[#141414] px-3 py-2 text-xs text-white outline-none focus:border-red-400"
                      />
                      <button
                        onClick={() => void toggleSuspend(site)}
                        disabled={busySlug === site.slug}
                        className="flex items-center gap-1.5 rounded-xl bg-red-500/90 px-3 py-2 text-xs font-black text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        {busySlug === site.slug ? <Loader2 className="animate-spin" size={13} /> : <Ban size={13} />} إيقاف
                      </button>
                    </div>
                  )}
                  {suspended && (
                    <button
                      onClick={() => void toggleSuspend(site)}
                      disabled={busySlug === site.slug}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-black text-black hover:brightness-110 disabled:opacity-50"
                    >
                      {busySlug === site.slug ? <Loader2 className="animate-spin" size={15} /> : <PlayCircle size={15} />} فتح الفرع وإعادة تشغيله
                    </button>
                  )}

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#141414] p-2.5">
                      <ExternalLink size={13} className="shrink-0 text-zinc-500" />
                      <a href={site.publicUrl} target="_blank" rel="noreferrer" dir="ltr" className="flex-1 truncate text-xs text-[var(--color-primary)] hover:underline">{site.publicUrl}</a>
                      <button onClick={() => copy(site.publicUrl, `p-${site.id}`)} className="rounded-md bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10">
                        {copied === `p-${site.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#141414] p-2.5">
                      <Lock size={13} className="shrink-0 text-zinc-500" />
                      <a href={site.adminUrl} target="_blank" rel="noreferrer" dir="ltr" className="flex-1 truncate text-xs text-amber-400 hover:underline">{site.adminUrl}</a>
                      <button onClick={() => copy(site.adminUrl, `a-${site.id}`)} className="rounded-md bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10">
                        {copied === `a-${site.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}