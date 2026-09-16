"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Check, Loader2, Wallet, Landmark, Smartphone, ArrowDownToLine, Zap, KeyRound, RefreshCw, QrCode, Coins, Clock, AlertTriangle } from "lucide-react";

type Props = { slug: string; siteName: string };
type PaymentMethod = { name: string; instructions: string; enabled: boolean };
type CryptoWallet = { coin: string; network: string; address: string; enabled: boolean; visible?: boolean };
type AsiacellState = { connected: boolean; admin_connected: boolean; store_phone: string; exchange_rate: number };

const coinMeta: Record<string, { color: string; label: string }> = {
  usdt: { color: "#26a17b", label: "USDT" },
  bnb: { color: "#f0b90b", label: "BNB" },
  btc: { color: "#f7931a", label: "BTC" },
};

const networkLabel: Record<string, string> = {
  bep20: "BSC (BEP20)", trc20: "Tron (TRC20)", erc20: "Ethereum (ERC20)",
  polygon: "Polygon", xlayer: "X Layer", segwit: "Bitcoin (SegWit)",
};

export default function PortalDeposit({ slug, siteName }: Props) {
  const base = `/api/sites/${encodeURIComponent(slug)}`;
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // بيانات الدفع
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const [asiacell, setAsiacell] = useState<AsiacellState>({ connected: false, admin_connected: false, store_phone: "", exchange_rate: 1666 });

  // آسياسيل
  const [asiPhone, setAsiPhone] = useState("");
  const [asiOtp, setAsiOtp] = useState("");
  const [asiVoucher, setAsiVoucher] = useState("");
  const [asiAmount, setAsiAmount] = useState("");
  const [asiSession, setAsiSession] = useState<string | null>(null);
  const [asiStep, setAsiStep] = useState<"idle" | "otp" | "ready">("idle");
  const [asiLoading, setAsiLoading] = useState(false);
  const [asiMsg, setAsiMsg] = useState<string | null>(null);
  const [asiErr, setAsiErr] = useState<string | null>(null);

  // كريبتو
  const [selectedWallet, setSelectedWallet] = useState<CryptoWallet | null>(null);
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [cryptoTxId, setCryptoTxId] = useState("");
  const [cryptoDepositId, setCryptoDepositId] = useState<string | null>(null);
  const [cryptoStep, setCryptoStep] = useState<"select" | "send" | "verify">("select");
  const [cryptoLoading, setCryptoLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${base}/deposit`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.paymentMethods)) setMethods(data.paymentMethods);
      if (Array.isArray(data.cryptoWallets)) setCryptoWallets(data.cryptoWallets);
      if (data.asiacell) setAsiacell(data.asiacell);
    } catch {} finally { setLoading(false); }
  }, [base]);

  useEffect(() => { void refresh(); }, [refresh]);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); } catch {}
  };

  // ── آسياسيل ──
  const callAsi = useCallback(async (body: Record<string, unknown>) => {
    setAsiLoading(true); setAsiErr(null); setAsiMsg(null);
    try {
      const res = await fetch(`${base}/deposit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) { setAsiErr(data.error || "فشلت العملية"); return data; }
      if (data.message) setAsiMsg(data.message);
      return data;
    } catch { setAsiErr("تعذر الاتصال بالبوابة"); return null; } finally { setAsiLoading(false); }
  }, [base]);

  const asiLogin = async () => {
    if (!asiPhone.trim()) { setAsiErr("أدخل رقم آسياسيل"); return; }
    const data = await callAsi({ action: "asiacell-login", phone: asiPhone.trim() });
    if (data?.success && data.sessionId) { setAsiSession(data.sessionId); setAsiStep("otp"); setAsiMsg("أدخل رمز التحقق المرسل إلى رقمك"); }
  };
  const asiVerify = async () => {
    if (!asiSession || !asiOtp.trim()) { setAsiErr("أدخل رمز التحقق"); return; }
    const data = await callAsi({ action: "asiacell-verify-otp", sessionId: asiSession, otp: asiOtp.trim() });
    if (data?.success) { setAsiStep("ready"); setAsiMsg("تم التحقق! يمكنك الشحن الآن"); }
  };
  const asiTopup = async () => {
    if (!asiVoucher.trim()) { setAsiErr("أدخل رقم كرت الشحن"); return; }
    await callAsi({ action: "asiacell-topup", sessionId: asiSession, voucher: asiVoucher.trim() });
  };
  const asiTransfer = async () => {
    const amt = Number(asiAmount);
    if (!amt || amt < 250) { setAsiErr("الحد الأدنى 250 د.ع"); return; }
    const data = await callAsi({ action: "asiacell-transfer", sessionId: asiSession, amount: amt });
    if (data?.success) { setAsiStep("ready"); setAsiMsg("أدخل رمز التأكيد المرسل من آسياسيل"); }
  };
  const asiConfirm = async () => {
    if (!asiOtp.trim()) { setAsiErr("أدخل رمز التأكيد"); return; }
    await callAsi({ action: "asiacell-confirm", sessionId: asiSession, otp: asiOtp.trim() });
  };
  const resetAsi = () => { setAsiSession(null); setAsiPhone(""); setAsiOtp(""); setAsiVoucher(""); setAsiAmount(""); setAsiStep("idle"); setAsiMsg(null); setAsiErr(null); };

  // ── كريبتو ──
  const submitCrypto = async () => {
    if (!selectedWallet || !cryptoAmount) return;
    const amt = Number(cryptoAmount);
    if (!amt || amt <= 0) { setMessage({ text: "أدخل مبلغ صحيح", error: true }); return; }
    setCryptoLoading(true); setMessage(null);
    try {
      const body: Record<string, unknown> = { action: "crypto-deposit", coin: selectedWallet.coin, network: selectedWallet.network, amount: amt };
      if (cryptoTxId.trim()) body.txId = cryptoTxId.trim();
      const res = await fetch(`${base}/deposit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) { setMessage({ text: data.error || "فشلت العملية", error: true }); return; }
      setCryptoDepositId(data.depositId);
      if (data.autoVerified) { setMessage({ text: data.message || "تم الشحن بنجاح!" }); setCryptoStep("select"); }
      else if (data.needsVerification || data.walletAddress) { setCryptoStep("verify"); setMessage({ text: data.message }); }
      else { setMessage({ text: data.message }); setCryptoStep("verify"); }
    } catch { setMessage({ text: "تعذر الاتصال بالخادم", error: true }); }
    finally { setCryptoLoading(false); }
  };

  const verifyCrypto = async () => {
    if (!cryptoTxId.trim() || !cryptoDepositId) return;
    setCryptoLoading(true);
    try {
      const res = await fetch(`${base}/deposit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "crypto-verify", txId: cryptoTxId.trim(), depositId: cryptoDepositId }) });
      const data = await res.json();
      if (!res.ok || data.error) { setMessage({ text: data.error || "فشل التحقق", error: true }); return; }
      setMessage({ text: data.message || "تم الشحن بنجاح!" }); setCryptoStep("select"); setCryptoTxId("");
    } catch { setMessage({ text: "تعذر الاتصال بالخادم", error: true }); }
    finally { setCryptoLoading(false); }
  };

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ تحميل طرق الشحن...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">شحن الرصيد</h1>
        <p className="mt-1 text-sm text-zinc-400">أضف رصيدًا إلى حسابك داخل {siteName}</p>
      </div>

      {/* هيدر */}
      <div className="rounded-3xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-gold)] text-[#111]"><ArrowDownToLine size={26} /></div>
        <h2 className="text-lg font-black text-white">اختر طريقة الشحن</h2>
        <p className="mt-1 text-sm text-zinc-400">آسياسيل تلقائي أو عملات رقمية أو طرق يدوية</p>
      </div>

      {/* رسائل */}
      {message && <div className={`rounded-2xl p-4 text-sm font-bold ${message.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{message.text}</div>}

      {/* ── آسياسيل التلقائية ── */}
      {asiacell.connected || asiacell.admin_connected ? (
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-[#12291f] to-[#0a1812] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400"><Zap size={22} /></span>
            <div className="flex-1"><p className="font-black text-white">شحن تلقائي عبر آسياسيل</p><p className="text-xs text-zinc-400">شحن كرت أو تحويل فوري — يضاف الرصيد تلقائيًا</p></div>
            <button onClick={resetAsi} className="rounded-lg bg-white/5 p-2 text-zinc-400 hover:bg-white/10"><RefreshCw size={15} /></button>
          </div>
          {/* الخطوة 1: رقم الهاتف */}
          {!asiSession && asiStep === "idle" && (
            <div className="space-y-3">
              <input value={asiPhone} onChange={e => setAsiPhone(e.target.value)} placeholder="07XXXXXXXXX" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
              <button onClick={asiLogin} disabled={asiLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-[#111] disabled:opacity-50">
                {asiLoading ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />} تسجيل الدخول وإرسال OTP
              </button>
            </div>
          )}
          {/* الخطوة 2: OTP */}
          {asiStep === "otp" && (
            <div className="space-y-3">
              <input value={asiOtp} onChange={e => setAsiOtp(e.target.value)} placeholder="أدخل رمز التحقق" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
              <button onClick={asiVerify} disabled={asiLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-[#111] disabled:opacity-50">تأكيد الرمز</button>
              <button onClick={asiLogin} disabled={asiLoading} className="w-full text-center text-xs font-bold text-emerald-400/80">إعادة إرسال</button>
            </div>
          )}
          {/* الخطوة 3: الشحن */}
          {asiStep === "ready" && (
            <div className="space-y-4">
              <div><label className="mb-1 block text-xs font-bold text-zinc-400">رقم كرت الشحن (اختياري)</label>
                <input value={asiVoucher} onChange={e => setAsiVoucher(e.target.value)} placeholder="رقم كرت آسياسيل" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
                <button onClick={asiTopup} disabled={asiLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-sm font-black text-emerald-300 disabled:opacity-50">شحن الكرت الآن</button>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500"><span className="h-px flex-1 bg-white/10" />أو<span className="h-px flex-1 bg-white/10" /></div>
              <div><label className="mb-1 block text-xs font-bold text-zinc-400">تحويل رصيد (د.ع)</label>
                <input value={asiAmount} onChange={e => setAsiAmount(e.target.value)} placeholder="مثال: 5000" dir="ltr" type="number" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
                {asiacell.exchange_rate ? <p className="mt-1 text-[11px] text-zinc-500">سعر الصرف: {asiacell.exchange_rate.toLocaleString("ar-IQ")} د.ع = 1$</p> : null}
                {Number(asiAmount) > 0 && asiacell.exchange_rate ? (
                  <p className="mt-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-black text-emerald-300">
                    ≈ {((Number(asiAmount) / asiacell.exchange_rate) || 0).toFixed(4)} $ <span className="text-[11px] font-bold text-emerald-400/70">تُضاف لرصيدك</span>
                  </p>
                ) : null}
                <button onClick={asiTransfer} disabled={asiLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-black text-[#111] disabled:opacity-50">بدء التحويل</button>
              </div>
              <div><label className="mb-1 block text-xs font-bold text-zinc-400">رمز التأكيد من آسياسيل</label>
                <input value={asiOtp} onChange={e => setAsiOtp(e.target.value)} placeholder="أدخل رمز التأكيد" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
                <button onClick={asiConfirm} disabled={asiLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-black text-[#111] disabled:opacity-50">تأكيد التحويل</button>
                <button onClick={() => callAsi({ action: "asiacell-resend", sessionId: asiSession })} disabled={asiLoading} className="mt-1 w-full text-center text-xs font-bold text-emerald-400/80">إعادة إرسال رمز التأكيد</button>
              </div>
            </div>
          )}
          {asiMsg && <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{asiMsg}</p>}
          {asiErr && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{asiErr}</p>}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400"><Zap size={22} /></span>
            <div><p className="font-black text-white">شحن تلقائي عبر آسياسيل</p><p className="text-xs text-zinc-500">البوابة غير مفعلة — استخدم الطرق الأخرى</p></div>
          </div>
        </div>
      )}

      {/* ── العملات الرقمية ── */}
      {cryptoWallets.length > 0 && (
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#2a1f0b] to-[#1a1506] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400"><Coins size={22} /></span>
            <div><p className="font-black text-white">شحن بالعملات الرقمية</p><p className="text-xs text-zinc-400">USDT / BNB / BTC — التحقق التلقائي عبر OKX</p></div>
          </div>

          {cryptoStep === "select" && (
            <div className="space-y-3">
              {cryptoWallets.map((w, i) => (
                <button key={i} onClick={() => { setSelectedWallet(w); setCryptoStep("send"); }} className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-[#141414] p-4 hover:border-amber-500/30 transition">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm" style={{ background: coinMeta[w.coin]?.color || "#666", color: "#000" }}>{(coinMeta[w.coin]?.label || w.coin).slice(0, 3)}</span>
                  <div className="flex-1 text-right"><p className="font-black text-white text-sm">{coinMeta[w.coin]?.label || w.coin.toUpperCase()}</p><p className="text-[10px] text-zinc-500">{networkLabel[w.network] || w.network}</p></div>
                  <span className="text-xs text-zinc-400">←</span>
                </button>
              ))}
            </div>
          )}

          {cryptoStep === "send" && selectedWallet && (
            <div className="space-y-3">
              <button onClick={() => { setCryptoStep("select"); setSelectedWallet(null); }} className="text-xs text-zinc-500 hover:text-white">← العودة</button>
              <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-4 text-center">
                <p className="text-xs text-zinc-400 mb-2">أرسل المبلغ إلى هذا العنوان</p>
                <p className="font-mono text-sm text-amber-300 break-all" dir="ltr">{selectedWallet.address}</p>
                <button onClick={() => copy(selectedWallet.address, "wallet")} className="mt-2 flex items-center gap-1.5 mx-auto rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10">
                  {copied === "wallet" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} {copied === "wallet" ? "تم النسخ" : "نسخ العنوان"}
                </button>
                <p className="mt-3 text-[10px] text-zinc-500">{coinMeta[selectedWallet.coin]?.label} — {networkLabel[selectedWallet.network] || selectedWallet.network}</p>
              </div>
              <div><label className="mb-1 block text-xs font-bold text-zinc-400">المبلغ المراد شحنه ($)</label>
                <input value={cryptoAmount} onChange={e => setCryptoAmount(e.target.value)} placeholder="مثال: 10" dir="ltr" type="number" step="0.01" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-white outline-none focus:border-amber-500/50" />
              </div>
              <button onClick={submitCrypto} disabled={cryptoLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-black text-[#111] disabled:opacity-50">
                {cryptoLoading ? <Loader2 className="animate-spin" size={16} /> : <Coins size={16} />} إرسال طلب الشحن
              </button>
            </div>
          )}

          {cryptoStep === "verify" && (
            <div className="space-y-3">
              <button onClick={() => { setCryptoStep("select"); setCryptoTxId(""); setCryptoDepositId(null); }} className="text-xs text-zinc-500 hover:text-white">← العودة</button>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-2"><Clock size={14} className="text-amber-400" /><p className="text-xs font-black text-amber-300">أدخل رقم المعاملة (TxID) للتحقق التلقائي</p></div>
                <input value={cryptoTxId} onChange={e => setCryptoTxId(e.target.value)} placeholder="0x... أو TX hash" dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d1a14] px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50" />
                <button onClick={verifyCrypto} disabled={cryptoLoading || !cryptoTxId.trim()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-black text-[#111] disabled:opacity-50">
                  {cryptoLoading ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} التحقق من التحويل
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 text-center">سيتحقق النظام تلقائيًا من المعاملة عبر OKX ويشحن رصيدك</p>
            </div>
          )}
        </div>
      )}

      {/* ── الطرق اليدوية ── */}
      {methods.map((m, i) => (
        <div key={`${m.name}-${i}`} className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]"><Wallet size={22} /></span>
            <div className="flex-1"><p className="font-black text-white">{m.name}</p><p className="text-xs text-zinc-500">تحويل يدوي</p></div>
          </div>
          {m.instructions && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#1a1a1a] p-4">
              <p className="whitespace-pre-line text-sm leading-7 text-zinc-300">{m.instructions}</p>
              <button onClick={() => copy(m.instructions, `${m.name}-${i}`)} className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10">
                {copied === `${m.name}-${i}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} {copied === `${m.name}-${i}` ? "تم النسخ" : "نسخ التعليمات"}
              </button>
            </div>
          )}
        </div>
      ))}

      {methods.length === 0 && cryptoWallets.length === 0 && (!asiacell.connected && !asiacell.admin_connected) && (
        <p className="rounded-3xl border border-white/5 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">لا توجد طرق شحن مفعّلة. تواصل مع إدارة {siteName}.</p>
      )}

      <p className="rounded-2xl bg-amber-500/10 p-4 text-center text-xs leading-6 text-amber-300">
        بعد إتمام عملية الشحن، أرسل إثبات الدفع إلى إدارة {siteName} لتأكيد إيداع رصيدك خلال أقصر وقت.
      </p>
    </div>
  );
}