"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Minus, ShoppingCart } from "lucide-react";

type Props = { slug: string };

type Service = { service: string; name: string; nameAr: string; rate: number; min: number; max: number };

export default function NewOrderPage({ slug }: Props) {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceId, setServiceId] = useState("");
  const [link, setLink] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/services`, { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.services)) setServices(data.services);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [slug]);

  const submit = async () => {
    if (!serviceId || !link || qty <= 0) { setMsg({ text: "أكمل جميع الحقول", error: true }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/orders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, link, quantity: qty }),
      });
      const data = await res.json();
      if (data.success) { setMsg({ text: "تم إنشاء الطلب بنجاح!" }); router.push(`/sites/${slug}/orders`); }
      else setMsg({ text: data.error || "فشل إنشاء الطلب", error: true });
    } catch { setMsg({ text: "تعذر الاتصال", error: true }); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ تحميل الخدمات...</div>;

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-black text-white">طلب جديد</h1><p className="mt-1 text-sm text-zinc-400">أنشئ طلب خدمة جديد</p></div>
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <label className="mb-1 block text-xs font-bold text-zinc-400">اختر الخدمة</label>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]/40">
          <option value="">— اختر —</option>
          {services.map((s) => <option key={s.service} value={s.service}>{s.nameAr || s.name}</option>)}
        </select>
        <label className="mb-1 mt-4 block text-xs font-bold text-zinc-400">رابط الحساب</label>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://instagram.com/..." dir="ltr" className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]/40" />
        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => setQty((q) => Math.max(1, q - 100))} className="rounded-xl bg-white/5 p-3 text-zinc-300 hover:bg-white/10"><Minus size={16} /></button>
          <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} min={1} className="w-24 rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-3 text-center text-sm text-white outline-none" />
          <button onClick={() => setQty((q) => q + 100)} className="rounded-xl bg-white/5 p-3 text-zinc-300 hover:bg-white/10"><Plus size={16} /></button>
        </div>
      </div>
      {msg && <div className={`rounded-2xl p-3 text-sm font-bold ${msg.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{msg.text}</div>}
      <button onClick={() => void submit()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-gold)] py-3.5 font-black text-black disabled:opacity-50">
        {busy ? <Loader2 className="animate-spin" size={18} /> : <ShoppingCart size={18} />}
        إنشاء الطلب
      </button>
    </div>
  );
}