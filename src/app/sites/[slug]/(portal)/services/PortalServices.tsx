"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Clock, ShoppingCart, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";

type Props = { slug: string; siteName: string };

type Service = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: string;
  rate: number;
  min: number;
  max: number;
};

type OrderResult = {
  success?: boolean;
  error?: string;
  order?: { id: number; service_name: string; quantity: number; charge: number; status: string };
};

export default function PortalServices({ slug, siteName }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  // Order modal state
  const [selected, setSelected] = useState<Service | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState<number>(100);
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/services`, { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.services)) {
          setServices(data.services);
          if (Array.isArray(data.categories)) setCategories(data.categories);
        }
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [slug]);

  const filtered = services.filter((s) => {
    const q = deferredSearch.trim().toLowerCase();
    const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    const matchesCategory = activeCategory === "all" || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const openOrder = (service: Service) => {
    setSelected(service);
    setLink("");
    setQuantity(service.min || 100);
    setOrderMessage(null);
  };

  const submitOrder = async () => {
    if (!selected) return;
    setSubmitting(true);
    setOrderMessage(null);
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/orders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: selected.id, link: link.trim(), quantity }),
      });
      const data: OrderResult = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "تعذر إنشاء الطلب");
      setOrderMessage({ text: "تم إنشاء طلبك بنجاح! جارٍ المعالجة." });
      setLink("");
      window.setTimeout(() => {
        setSelected(null);
        router.push(`/sites/${encodeURIComponent(slug)}/orders`);
      }, 1200);
    } catch (caught: unknown) {
      setOrderMessage({ text: caught instanceof Error ? caught.message : "تعذر إنشاء الطلب", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-black text-white">متجر الخدمات</h1>
        <p className="text-sm text-zinc-400">تصفح واطلب أفضل الخدمات الرقمية</p>
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن خدمة..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-4 pr-11 text-white outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                activeCategory === "all" ? "bg-[var(--color-primary)] text-black" : "bg-white/5 text-zinc-400"
              }`}
            >
              الكل
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  activeCategory === category ? "bg-[var(--color-primary)] text-black" : "bg-white/5 text-zinc-400"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading && <p className="col-span-full py-10 text-center text-zinc-500">جارٍ تحميل الخدمات...</p>}
        {!loading && filtered.length === 0 && <p className="col-span-full py-10 text-center text-zinc-500">لا توجد خدمات مطابقة.</p>}
        {filtered.map((service) => (
          <div key={service.id} className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-[var(--color-gold)]/40 hover:bg-white/[0.06]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                    <Package size={16} />
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-400">{service.category}</span>
                </div>
                <h3 className="font-black text-white">{service.name}</h3>
                {service.description && <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{service.description}</p>}
                <p className="mt-2 text-xs text-zinc-500">
                  الحد الأدنى: {service.min} · الحد الأقصى: {service.max > 0 ? service.max : "غير محدود"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <Clock size={12} /> فوري
              </div>
              <div className="flex-1" />
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">السعر لكل 1000</p>
                <p className="font-black text-[var(--color-primary)]">${Number(service.rate || 0).toFixed(2)}</p>
              </div>
              <button
                onClick={() => openOrder(service)}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-black text-black hover:brightness-110"
              >
                <ShoppingCart size={14} /> اطلب
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141414] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">{selected.name}</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {Number(selected.rate).toFixed(2)} USD / 1000 · الحد الأدنى {selected.min}
                  {selected.max > 0 ? ` · الحد الأقصى ${selected.max}` : ""}
                </p>
              </div>
              <button onClick={() => !submitting && setSelected(null)} className="rounded-full bg-white/5 p-2 text-zinc-400 hover:bg-white/10">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-zinc-300">رابط الطلب</span>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-zinc-300">الكمية</span>
                <input
                  type="number"
                  value={quantity}
                  min={selected.min || 1}
                  max={selected.max || undefined}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]"
                />
              </label>
              <div className="rounded-xl bg-white/5 p-3 text-sm text-zinc-300">
                التكلفة المتوقعة: <strong className="text-[var(--color-primary)]">${((Number(selected.rate) * (quantity || 0)) / 1000).toFixed(2)} USD</strong>
              </div>
              {orderMessage && (
                <div className={`flex items-start gap-2 rounded-xl p-3 text-sm font-bold ${orderMessage.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                  {orderMessage.error ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
                  {orderMessage.text}
                </div>
              )}
              <button
                onClick={submitOrder}
                disabled={submitting || !link.trim() || !quantity || quantity <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3.5 font-black text-black hover:brightness-110 disabled:opacity-50"
              >
                {submitting ? <><Loader2 className="animate-spin" size={18} /> جارٍ إنشاء الطلب...</> : <><ShoppingCart size={18} /> تأكيد الطلب</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}