"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, Check, CreditCard, Palette, TrendingUp, Zap, Coins, Wallet, ArrowDownToLine, Settings2, Eye, EyeOff } from "lucide-react";
type Props = { slug: string; siteName: string };
type PaymentMethod = { name: string; instructions: string; enabled: boolean };
type CryptoWallet = { coin: string; network: string; address: string; enabled: boolean; visible?: boolean };
type AsiacellConfig = { storePhone: string; exchangeRate: number; enabled: boolean };

export default function ResellerSettingsPage({ slug, siteName }: Props) {
  const base = `/api/sites/${encodeURIComponent(slug)}`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [theme, setTheme] = useState<Record<string, unknown>>({});
  const [markup, setMarkup] = useState<number | "">("");
  const [asiacell, setAsiacell] = useState<AsiacellConfig>({ storePhone: "", exchangeRate: 1666, enabled: false });
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${base}/admin/settings`, { cache: "no-store" });
        const data = await res.json();
        if (data.paymentMethods) setMethods(data.paymentMethods);
        if (data.theme) setTheme(data.theme);
        if (typeof data.markupPercent === "number") setMarkup(data.markupPercent);
        if (data.asiacell) setAsiacell(data.asiacell);
        if (data.cryptoWallets) setCryptoWallets(data.cryptoWallets);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [base]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${base}/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          paymentMethods: methods,
          markupPercent: markup === "" ? 0 : Number(markup),
          asiacell,
          cryptoWallets,
        }),
      });
      const data = await res.json();
      if (data.success) setMessage({ text: "تم حفظ الإعدادات بنجاح" });
      else setMessage({ text: data.error || "فشل الحفظ", error: true });
    } catch {
      setMessage({ text: "تعذر الاتصال بالخادم", error: true });
    } finally { setSaving(false); }
  };

  const updateMethod = (i: number, k: keyof PaymentMethod, v: string | boolean) => setMethods(p => p.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  const updateCrypto = (i: number, k: keyof CryptoWallet, v: string | boolean) => setCryptoWallets(p => p.map((w, idx) => idx === i ? { ...w, [k]: v } : w));
  const addCrypto = () => setCryptoWallets(p => [...p, { coin: "usdt", network: "bep20", address: "", enabled: true }]);

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">إعدادات {siteName}</h1>
        <p className="mt-1 text-sm text-zinc-400">تحكم كامل — بوابات الدفع والشحن التلقائي والهوية والأسعار</p>
      </div>

      {/* ── بوابة آسياسيل التلقائية ── */}
      <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><Zap size={18} /></span>
          <div className="flex-1">
            <h2 className="font-black text-white">بوابة آسياسيل التلقائية</h2>
            <p className="text-xs text-zinc-500">شحن كرت أو تحويل فوري — يضاف الرصيد تلقائيًا لعملائك</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={asiacell.enabled} onChange={e => setAsiacell(p => ({ ...p, enabled: e.target.checked }))} className="accent-emerald-500" /> تفعيل
          </label>
        </div>
        {asiacell.enabled && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-zinc-300">رقم آسياسيل للمتجر
              <input value={asiacell.storePhone} onChange={e => setAsiacell(p => ({ ...p, storePhone: e.target.value }))} placeholder="07XXXXXXXXX" dir="ltr" className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-3 text-sm text-white outline-none focus:border-emerald-500/40" />
            </label>
            <label className="text-xs font-bold text-zinc-300">سعر صرف الدينار العراقي
              <div className="flex items-center gap-2 mt-1.5">
                <input type="number" value={asiacell.exchangeRate} onChange={e => setAsiacell(p => ({ ...p, exchangeRate: Number(e.target.value) }))} dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-3 text-sm text-white outline-none focus:border-emerald-500/40" />
                <span className="text-xs text-zinc-500 whitespace-nowrap">د.ع = 1$</span>
              </div>
            </label>
          </div>
        )}
      </section>

      {/* ── بوابات العملات الرقمية ── */}
      <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400"><Coins size={18} /></span>
            <div>
              <h2 className="font-black text-white">بوابات العملات الرقمية</h2>
              <p className="text-xs text-zinc-500">USDT / BNB / BTC — التحقق التلقائي عبر OKX. أيقونة العين: إخفاء/إظهار العملة من صفحة الشحن الخاصة بالعملاء.</p>
            </div>
          </div>
          <button onClick={addCrypto} className="flex items-center gap-1 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-black text-amber-400 hover:bg-amber-500/25">
            <Plus size={14} /> إضافة
          </button>
        </div>
        {cryptoWallets.length === 0 && (
          <p className="rounded-xl bg-white/[0.03] p-4 text-sm text-zinc-500">لا توجد محافظ كريبتو — أضف عنوان محفظة لبدء الشحن التلقائي</p>
        )}
        <div className="space-y-3">
          {cryptoWallets.map((w, i) => (
            <div key={i} className="grid gap-2 rounded-2xl border border-white/5 bg-[#141414] p-3 sm:grid-cols-[100px_120px_1fr_auto_auto] items-center">
              <select value={w.coin} onChange={e => updateCrypto(i, "coin", e.target.value)} className="rounded-lg border border-white/10 bg-[#0d0d0d] px-2 py-2 text-xs text-white">
                <option value="usdt">USDT</option><option value="bnb">BNB</option><option value="btc">BTC</option>
              </select>
              <select value={w.network} onChange={e => updateCrypto(i, "network", e.target.value)} className="rounded-lg border border-white/10 bg-[#0d0d0d] px-2 py-2 text-xs text-white">
                <option value="bep20">BSC (BEP20)</option><option value="trc20">Tron (TRC20)</option><option value="erc20">Ethereum (ERC20)</option><option value="polygon">Polygon</option><option value="xlayer">X Layer</option><option value="segwit">Bitcoin (SegWit)</option>
              </select>
              <input value={w.address} onChange={e => updateCrypto(i, "address", e.target.value)} placeholder="عنوان المحفظة (0x... أو T...)" dir="ltr" className="rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-xs text-white outline-none focus:border-amber-500/40" />
              <label className="flex items-center gap-1 text-xs text-zinc-400">
                <input type="checkbox" checked={w.enabled} onChange={e => updateCrypto(i, "enabled", e.target.checked)} /> مفعلة
              </label>
              <button onClick={() => updateCrypto(i, "visible", w.visible === false)} title={w.visible === false ? "إظهار للعملاء" : "إخفاء من العملاء"} className={`rounded-lg px-2 py-2 ${w.visible === false ? "bg-red-500/10 text-red-300 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"}`}>
                {w.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => setCryptoWallets(p => p.filter((_, idx) => idx !== i))} className="rounded-lg bg-red-500/10 px-2 py-2 text-red-300 hover:bg-red-500/20"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </section>

      {/* ── الطرق اليدوية ── */}
      <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><CreditCard size={18} /></span>
            <div>
              <h2 className="font-black text-white">طرق الدفع اليدوية</h2>
              <p className="text-xs text-zinc-500">تحويل بنكي، أو أي طريقة أخرى تحتاج تأكيد يدوي</p>
            </div>
          </div>
          <button onClick={() => setMethods(p => [...p, { name: "", instructions: "", enabled: true }])} className="flex items-center gap-1 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-500/25">
            <Plus size={14} /> إضافة
          </button>
        </div>
        <div className="space-y-3">
          {methods.length === 0 && <p className="rounded-xl bg-white/[0.03] p-4 text-sm text-zinc-500">لا توجد طرق دفع يدوية</p>}
          {methods.map((m, i) => (
            <div key={i} className="grid gap-2 rounded-2xl border border-white/5 bg-[#141414] p-3 sm:grid-cols-[1fr_1.5fr_auto_auto]">
              <input value={m.name} onChange={e => updateMethod(i, "name", e.target.value)} placeholder="اسم الطريقة" className="rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40" />
              <input value={m.instructions} onChange={e => updateMethod(i, "instructions", e.target.value)} placeholder="التعليمات أو رقم الحساب" className="rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40" />
              <label className="flex items-center gap-1 text-xs text-zinc-400">
                <input type="checkbox" checked={m.enabled} onChange={e => updateMethod(i, "enabled", e.target.checked)} /> مفعلة
              </label>
              <button onClick={() => setMethods(p => p.filter((_, idx) => idx !== i))} className="rounded-lg bg-red-500/10 px-2 text-red-300 hover:bg-red-500/20"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </section>

      {/* ── هوية الموقع ── */}
      <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400"><Palette size={18} /></span>
          <div><h2 className="font-black text-white">هوية الموقع</h2><p className="text-xs text-zinc-500">اسم الموقع الظاهر</p></div>
        </div>
        <input value={String(theme.siteName || "")} onChange={e => setTheme(p => ({ ...p, siteName: e.target.value }))} placeholder="اسم الموقع" className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/40" />
      </section>

      {/* ── نسبة الربح ── */}
      <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400"><TrendingUp size={18} /></span>
          <div><h2 className="font-black text-white">نسبة الربح (الهامش)</h2><p className="text-xs text-zinc-500">تُضاف على جميع أسعار الخدمات</p></div>
        </div>
        <div className="flex items-center gap-3">
          <input type="number" min={0} max={10000} step={0.5} value={markup === "" ? "" : String(markup)} onChange={e => setMarkup(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0% = السعر الأصلي، 50% = زيادة 50%" className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-amber-500/40" />
          <span className="shrink-0 rounded-xl bg-white/5 px-3 py-3 text-sm font-black text-amber-400">%</span>
        </div>
      </section>

      {message && (
        <div className={`rounded-2xl p-4 text-sm font-bold ${message.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {message.error ? "✕ " : <Check size={16} className="ml-1 inline" />}{message.text}
        </div>
      )}

      <button onClick={save} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-black text-black disabled:opacity-50">
        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} حفظ الإعدادات
      </button>
    </div>
  );
}