"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Clock, RefreshCw } from "lucide-react";

type Props = { slug: string; siteName: string };

type Order = {
  id: number;
  service_name?: string;
  status: string;
  created_at?: string;
  quantity?: number;
  charge?: number;
  link?: string;
  remains?: number | null;
  start_count?: number | null;
};

const statusColors: Record<string, string> = {
  Pending: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  pending: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  processing: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  in_progress: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  partial: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  completed: "text-green-400 bg-green-400/10 border-green-400/30",
  Completed: "text-green-400 bg-green-400/10 border-green-400/30",
  canceled: "text-red-400 bg-red-400/10 border-red-400/30",
  Cancelled: "text-red-400 bg-red-400/10 border-red-400/30",
  failed: "text-red-500 bg-red-500/10 border-red-500/30",
  refunded: "text-zinc-400 bg-zinc-400/10 border-zinc-400/30",
  paused: "text-yellow-300 bg-yellow-400/10 border-yellow-400/30",
};

const statusLabels: Record<string, string> = {
  Pending: "قيد الانتظار",
  pending: "قيد الانتظار",
  processing: "قيد المعالجة",
  in_progress: "قيد التنفيذ",
  partial: "جزئي",
  completed: "مكتمل",
  Completed: "مكتمل",
  canceled: "ملغي",
  Cancelled: "ملغي",
  failed: "فاشل",
  refunded: "مسترجع",
  paused: "متوقف مؤقتًا",
};

export default function PortalOrders({ slug, siteName }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/orders`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.orders)) setOrders(data.orders);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void load(); }, [slug]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">طلباتي</h1>
          <p className="mt-1 text-sm text-zinc-400">متابعة حالة طلباتك في {siteName}</p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> تحديث
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03]">
        {loading && <p className="p-6 text-center text-zinc-500">جارٍ تحميل الطلبات...</p>}
        {!loading && orders.length === 0 && (
          <div className="p-10 text-center">
            <ShoppingCart className="mx-auto mb-3 text-zinc-600" size={36} />
            <p className="font-bold text-zinc-400">لا توجد طلبات بعد.</p>
            <p className="mt-1 text-sm text-zinc-500">تصفح الخدمات وأنشئ طلبك الأول.</p>
          </div>
        )}
        {orders.map((order) => {
          const color = statusColors[order.status] || "text-zinc-300 bg-white/10 border-white/10";
          const label = statusLabels[order.status] || order.status;
          return (
            <div key={order.id} className="flex items-center justify-between border-b border-white/5 p-4 last:border-0">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
                  <ShoppingCart size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{order.service_name || `طلب #${order.id}`}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                    <Clock size={11} /> #{order.id} · {order.quantity ?? 0} وحدة
                    {order.charge != null && <> · ${Number(order.charge).toFixed(2)}</>}
                  </p>
                  {order.remains != null && order.start_count != null && (
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      البداية {order.start_count} · المتبقي {order.remains}
                    </p>
                  )}
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${color}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}