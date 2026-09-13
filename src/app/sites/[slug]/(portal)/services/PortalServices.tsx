"use client";

import { useEffect, useState } from "react";
import { Search, Package, Clock } from "lucide-react";

type Props = { slug: string; siteName: string };

type Service = { id: string; name: string; category: string; rate: number; description?: string; avgTime?: string };

export default function PortalServices({ slug, siteName }: Props) {
  const [search, setSearch] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/services", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.services)) setServices(data.services);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, []);

  const filtered = services.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()));

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
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
              {service.avgTime && (
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <Clock size={12} /> {service.avgTime}
                </div>
              )}
              <div className="flex-1" />
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">السعر لكل 1000</p>
                <p className="font-black text-[var(--color-primary)]">${Number(service.rate || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}