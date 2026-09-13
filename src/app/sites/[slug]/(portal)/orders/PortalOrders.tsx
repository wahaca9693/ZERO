"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";

type Props = { slug: string; siteName: string };

type Order = { id: string; serviceName?: string; status: string; date?: string; quantity?: number };

export default function PortalOrders({ slug, siteName }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.orders)) setOrders(data.orders);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [slug]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-white">طلباتي</h1>
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03]">
        {loading && <p className="p-6 text-center text-zinc-500">جارٍ تحميل الطلبات...</p>}
        {!loading && orders.length === 0 && <p className="p-6 text-center text-zinc-500">لا توجد طلبات بعد.</p>}
        {orders.map((order) => (
          <div key={order.id} className="flex items-center justify-between border-b border-white/5 p-4 last:border-0">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
                <ShoppingCart size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-white">{order.serviceName || `طلب #${order.id}`}</p>
                <p className="text-xs text-zinc-500">{order.date || "—"}</p>
              </div>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-zinc-300">{order.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}