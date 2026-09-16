"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { Smartphone, Save, Loader2, RefreshCw, KeyRound, AlertCircle, Zap, CheckCircle2 } from "lucide-react";

type Props = { slug: string; siteName: string };

export default function AsiacellAdminPage({ slug, siteName }: Props) {
  const base = `/api/sites/${encodeURIComponent(slug)}`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const [storePhone, setStorePhone] = useState("");
  const [exchangeRate, setExchangeRate] = useState(1666);
  const [connected, setConnected] = useState(false);

  // خطوات الربط
  const [step, setStep] = useState<"idle" | "otp" | "ready">("idle");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [loadingAction, setLoadingAction] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${base}/payments/asiacell`, { cache: "no-store" });
      const data = await res.json();
      if (data.store_phone) setStorePhone(data.store_phone);
      if (data.exchange_rate) setExchangeRate(data.exchange_rate);
      setConnected(data.connected || data.admin_connected);
      if (data.authenticated !== undefined) setConnected(data.authenticated);
    } catch {}
    finally { setLoading(false); }
  }, [base]);

  useEffect(() => { void refresh(); }, [refresh]);

  const call = async (body: Record<string, unknown>) => {
    setLoadingAction(true); setActionErr(null); setActionMsg(null);
    try {
      const res = await fetch(`${base}/payments/asiacell`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) { throw new Error(data.error || "فشلت العملية"); }
      return data;
    } catch (e) { throw e instanceof Error ? e : new Error("تعذر الاتصال"); } finally { setLoadingAction(false); }
  };

  const saveSettings = async () => {
    setLoadingAction(true); setActionErr(null); setActionMsg(null);
    try {
      const res = await fetch(`${base}/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asiacell: { storePhone, exchangeRate: Number(exchangeRate), enabled: true } }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setActionMsg("تم حفظ إعدادات آسياسيل بنجاح");
      await refresh();
    } catch (e) { setActionErr(e instanceof Error ? e.message : "فشل الحفظ"); } finally { setLoadingAction(false); }
  };

  const startLink = async () => {
    if (!phone.trim()) { setActionErr("أدخل رقم آسياسيل"); return; }
    try {
      const data = await call({ action: "login", phone: phone.trim() });
      if (data.sessionId) { setStep("otp"); setActionMsg("أدخل رمز التحقق المرسل إلى رقمك"); }
    } catch (e) { setActionErr(e instanceof Error ? e.message : "فشل بدء الربط"); }
  };
  const verifyOtp = async () => {
    if (!otp.trim()) { setActionErr("أدخل رمز التحقق"); return; }
    try {
      const data = await call({ action: "verify-otp", sessionId, otp: otp.trim() });
      if (data.success) { setStep("ready"); setActionMsg("تم الربط بنجاح!"); }
    } catch (e) { setActionErr(e instanceof Error ? e.message : "فشل التحقق"); }
  };

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ التحميل...</div>;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-white">إدارة بوابة آسياسيل</h1>
          <p className="mt-1 text-sm text-zinc-400">ربط متجرك بشبكة آسياسيل للشحن التلقائي</p>
        </div>

        {message && <div className={`rounded-xl p-3 text-sm font-bold ${message.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{message.text}</div>}

        {/* الحالة الحالية */}
        <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><Zap size={18} /></span>
              <div><h2 className="font-black text-white">حالة البوابة</h2><p className="text-xs text-zinc-500">{connected ? "مربوطة وتعمل" : "غير مربوطة"}</p></div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-400"}`}>
              {connected ? <><CheckCircle2 size={11} className="inline ml-1" /> مربوطة</> : "غير مربوطة"}
            </span>
          </div>

          {/* إعدادات المتجر */}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-zinc-300">رقم آسياسيل للمتجر
              <input value={storePhone} onChange={e => setStorePhone(e.target.value)} placeholder="07XXXXXXXXX" dir="ltr" className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-3 text-sm text-white outline-none focus:border-emerald-500/40" />
            </label>
            <label className="text-xs font-bold text-zinc-300">سعر صرف الدينار
              <div className="flex items-center gap-2 mt-1.5">
                <input type="number" value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value))} dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-3 text-sm text-white outline-none focus:border-emerald-500/40" />
                <span className="text-xs text-zinc-500">د.ع = 1$</span>
              </div>
            </label>
          </div>

          <button onClick={saveSettings} disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-black text-[#111] disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} حفظ الإعدادات
          </button>
        </section>

        {/* عملية الربط */}
        <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400"><KeyRound size={18} /></span>
            <div><h2 className="font-black text-white">ربط رقم المتجر</h2><p className="text-xs text-zinc-500">أدخل رقم آسياسيل المرتبط بالمتجر</p></div>
          </div>

          {step === "idle" && (
            <div className="space-y-3">
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXXX" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-cyan-500/50" />
              <button onClick={startLink} disabled={loadingAction} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 font-black text-slate-950 disabled:opacity-50">
                {loadingAction ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />} إرسال رمز التحقق
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-3">
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="أدخل رمز التحقق" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-cyan-500/50" />
              <button onClick={verifyOtp} disabled={loadingAction} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 font-black text-slate-950 disabled:opacity-50">تأكيد الرمز</button>
            </div>
          )}

          {step === "ready" && (
            <div className="rounded-xl bg-emerald-500/10 p-4 text-center text-emerald-300 font-bold">
              <CheckCircle2 size={18} className="inline ml-1" /> تم ربط المتجر بنجاح!
            </div>
          )}

          {actionMsg && <p className={`mt-3 rounded-xl p-3 text-sm font-bold ${actionErr ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{actionMsg}</p>}
        </section>

        {actionMsg && !message && <div className={`rounded-xl p-3 text-sm font-bold ${actionErr ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{actionMsg}</div>}
      </div>
    </DashboardLayout>
  );
}