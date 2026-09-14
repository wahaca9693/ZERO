"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, Check, Loader2, Wallet, Landmark, Smartphone, ArrowDownToLine, Zap, KeyRound, RefreshCw } from "lucide-react";

type Props = { slug: string; siteName: string };

type PaymentMethod = { name: string; instructions: string; enabled: boolean };

type AsiacellState = {
  connected: boolean;
  admin_connected: boolean;
  store_phone: string;
  exchange_rate: number;
};

export default function PortalDeposit({ slug, siteName }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Asiacell gateway state
  const [asiacell, setAsiacell] = useState<AsiacellState | null>(null);
  const [asiacellLoading, setAsiacellLoading] = useState(false);
  const [asiacellPhone, setAsiacellPhone] = useState("");
  const [asiacellSession, setAsiacellSession] = useState<string | null>(null);
  const [asiacellOtp, setAsiacellOtp] = useState("");
  const [asiacellVoucher, setAsiacellVoucher] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [asiacellMsg, setAsiacellMsg] = useState<string | null>(null);
  const [asiacellErr, setAsiacellErr] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "otp" | "transfer-otp">("idle");

  const api = `/api/sites/${encodeURIComponent(slug)}`;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${api}/deposit`, { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.paymentMethods)) setMethods(data.paymentMethods);
        const ares = await fetch(`${api}/payments/asiacell`, { cache: "no-store" });
        if (ares.ok) setAsiacell(await ares.json());
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [api]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const methodIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("usdt") || lower.includes("crypto") || lower.includes("coin") || lower.includes("btc") || lower.includes("trc") || lower.includes("bep")) return <Landmark size={22} />;
    if (lower.includes("asia") || lower.includes("zain") || lower.includes("phone") || lower.includes("mobile")) return <Smartphone size={22} />;
    return <Wallet size={22} />;
  };

  const callAsiacell = useCallback(async (body: Record<string, unknown>) => {
    setAsiacellLoading(true);
    setAsiacellErr(null);
    setAsiacellMsg(null);
    try {
      const res = await fetch(`${api}/payments/asiacell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAsiacellErr(data.error || data.message || "فشلت العملية");
        return data;
      }
      if (data.message) setAsiacellMsg(data.message);
      return data;
    } catch {
      setAsiacellErr("تعذر الاتصال بالبوابة - حاول مرة أخرى");
      return null;
    } finally {
      setAsiacellLoading(false);
    }
  }, [api]);

  const startPhoneLogin = async () => {
    if (!asiacellPhone.trim()) { setAsiacellErr("أدخل رقم آسياسيل"); return; }
    const data = await callAsiacell({ action: "login", phone: asiacellPhone.trim() });
    if (data?.success && data.sessionId) {
      setAsiacellSession(data.sessionId);
      setStep("otp");
      setAsiacellMsg(data.message || "أدخل رمز التحقق المرسل إلى رقمك");
    }
  };

  const verifyOtp = async () => {
    if (!asiacellSession || !asiacellOtp.trim()) { setAsiacellErr("أدخل رمز التحقق"); return; }
    const data = await callAsiacell({ action: "verify-otp", sessionId: asiacellSession, otp: asiacellOtp.trim() });
    if (data?.success) {
      setStep("transfer-otp");
      setAsiacellMsg("تم التحقق! الآن يمكنك شحن كرت أو تحويل رصيد");
    }
  };

  const topupVoucher = async () => {
    if (!asiacellVoucher.trim()) { setAsiacellErr("أدخل رقم الكرت"); return; }
    await callAsiacell({ action: "topup", sessionId: asiacellSession, voucher: asiacellVoucher.trim() });
  };

  const startTransfer = async () => {
    const amount = Number(transferAmount);
    if (!amount || amount < 250) { setAsiacellErr("الحد الأدنى للتحويل 250 د.ع"); return; }
    const data = await callAsiacell({ action: "transfer", sessionId: asiacellSession, amount });
    if (data?.success) { setStep("transfer-otp"); setAsiacellMsg(data.message || "أدخل رمز التأكيد المرسل من آسياسيل"); }
  };

  const confirmTransferOtp = async () => {
    if (!asiacellSession || !asiacellOtp.trim()) { setAsiacellErr("أدخل رمز التأكيد"); return; }
    await callAsiacell({ action: "confirm", sessionId: asiacellSession, otp: asiacellOtp.trim() });
  };

  const resetAsiacell = () => {
    setAsiacellSession(null);
    setAsiacellPhone("");
    setAsiacellOtp("");
    setAsiacellVoucher("");
    setTransferAmount("");
    setStep("idle");
    setAsiacellMsg(null);
    setAsiacellErr(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-400">
        <Loader2 className="ml-2 animate-spin" size={20} /> جارٍ تحميل طرق الشحن...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">شحن الرصيد</h1>
        <p className="mt-1 text-sm text-zinc-400">أضف رصيدًا إلى حسابك داخل {siteName}</p>
      </div>

      <div className="rounded-3xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-gold)] text-[#111]">
          <ArrowDownToLine size={26} />
        </div>
        <h2 className="text-lg font-black text-white">اختر طريقة الشحن</h2>
        <p className="mt-1 text-sm text-zinc-400">بوابة آسياسيل التلقائية أو اتبع تعليمات الطريقة المختارة</p>
      </div>

      {/* Asiacell auto gateway */}
      {asiacell?.connected || asiacell?.admin_connected ? (
        <div className="rounded-3xl border border-[var(--color-primary)]/30 bg-gradient-to-br from-[#12291f] to-[#0a1812] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <Zap size={22} />
            </span>
            <div className="flex-1">
              <p className="font-black text-white">شحن تلقائي عبر آسياسيل</p>
              <p className="text-xs text-zinc-400">شحن كرت أو تحويل فوري ومباشر — يضاف الرصيد تلقائيًا</p>
            </div>
            <button onClick={resetAsiacell} className="rounded-lg bg-white/5 p-2 text-zinc-400 hover:bg-white/10"><RefreshCw size={15} /></button>
          </div>

          {!asiacellSession && step === "idle" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-400">رقم آسياسيل</label>
                <input value={asiacellPhone} onChange={(e) => setAsiacellPhone(e.target.value)} placeholder="07XXXXXXXXX" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
              </div>
              <button onClick={startPhoneLogin} disabled={asiacellLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-[#111] disabled:opacity-50">
                {asiacellLoading ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
                تسجيل الدخول وإرسال رمز التحقق
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-400">رمز التحقق (OTP)</label>
                <input value={asiacellOtp} onChange={(e) => setAsiacellOtp(e.target.value)} placeholder="أدخل الرمز" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
              </div>
              <button onClick={verifyOtp} disabled={asiacellLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-[#111] disabled:opacity-50">
                {asiacellLoading ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
                تأكيد الرمز
              </button>
              <button onClick={startPhoneLogin} disabled={asiacellLoading} className="w-full rounded-xl bg-white/5 py-2 text-xs font-bold text-zinc-400 hover:bg-white/10">إعادة إرسال</button>
            </div>
          )}

          {step === "transfer-otp" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-400">رقم كرت الشحن (اختياري)</label>
                <input value={asiacellVoucher} onChange={(e) => setAsiacellVoucher(e.target.value)} placeholder="أدخل رقم كرت آسياسيل" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
                <button onClick={topupVoucher} disabled={asiacellLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-sm font-black text-emerald-300 disabled:opacity-50">
                  {asiacellLoading ? <Loader2 className="animate-spin" size={15} /> : <Zap size={15} />}
                  شحن الكرت الآن
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500"><span className="h-px flex-1 bg-white/10" />أو<span className="h-px flex-1 bg-white/10" /></div>
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-400">تحويل رصيد (د.ع)</label>
                <input value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="مثال: 5000" dir="ltr" type="number" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
                {asiacell?.exchange_rate ? <p className="mt-1 text-[11px] text-zinc-500">سعر الصرف: {asiacell.exchange_rate.toLocaleString("ar-IQ")} د.ع = 1 دولار</p> : null}
                <button onClick={startTransfer} disabled={asiacellLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-black text-[#111] disabled:opacity-50">
                  {asiacellLoading ? <Loader2 className="animate-spin" size={15} /> : <Smartphone size={15} />}
                  بدء التحويل
                </button>
              </div>
              {step === "transfer-otp" && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-400">رمز التأكيد من آسياسيل</label>
                  <input value={asiacellOtp} onChange={(e) => setAsiacellOtp(e.target.value)} placeholder="أدخل رمز التأكيد" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
                  <button onClick={confirmTransferOtp} disabled={asiacellLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-black text-[#111] disabled:opacity-50">
                    {asiacellLoading ? <Loader2 className="animate-spin" size={15} /> : <KeyRound size={15} />}
                    تأكيد التحويل
                  </button>
                  <button onClick={() => callAsiacell({ action: "resend", sessionId: asiacellSession })} disabled={asiacellLoading} className="mt-1 w-full text-center text-xs font-bold text-emerald-400/80 hover:text-emerald-300">إعادة إرسال رمز التأكيد</button>
                </div>
              )}
            </div>
          )}

          {asiacellMsg && <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-300">{asiacellMsg}</p>}
          {asiacellErr && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm leading-6 text-red-300">{asiacellErr}</p>}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400"><Zap size={22} /></span>
            <div>
              <p className="font-black text-white">شحن تلقائي عبر آسياسيل</p>
              <p className="text-xs text-zinc-500">البوابة غير مفعلة بعد — استخدم الطرق اليدوية بالأسفل</p>
            </div>
          </div>
        </div>
      )}

      {methods.length === 0 && (
        <p className="rounded-3xl border border-white/5 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
          لا توجد طرق شحن مفعّلة حاليًا. تواصل مع إدارة {siteName} لشحن رصيدك.
        </p>
      )}

      {methods.map((method, index) => (
        <div key={`${method.name}-${index}`} className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
              {methodIcon(method.name)}
            </span>
            <div className="flex-1">
              <p className="font-black text-white">{method.name}</p>
              <p className="text-xs text-zinc-500">{index === 0 ? "الطريقة الرئيسية" : `طريقة ${index + 1}`}</p>
            </div>
          </div>
          {method.instructions && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#1a1a1a] p-4">
              <p className="whitespace-pre-line text-sm leading-7 text-zinc-300">{method.instructions}</p>
              <button
                onClick={() => copy(method.instructions, `${method.name}-${index}`)}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10"
              >
                {copied === `${method.name}-${index}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied === `${method.name}-${index}` ? "تم النسخ" : "نسخ التعليمات"}
              </button>
            </div>
          )}
        </div>
      ))}

      <p className="rounded-2xl bg-amber-500/10 p-4 text-center text-xs leading-6 text-amber-300">
        بعد إتمام عملية الشحن، أرسل إثبات الدفع إلى إدارة {siteName} لتأكيد إيداع رصيدك خلال أقصر وقت.
      </p>
    </div>
  );
}