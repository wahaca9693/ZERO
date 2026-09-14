"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Package, Clock3, CheckCircle2, XCircle } from "lucide-react";

type Props = { slug: string; siteName: string };

type OrderRow = {
  id: number;
  account_id: number;
  service_name: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  Pending: { label: "قيد الانتظار", cls: "bg-amber-500/15 text-amber-400" },
  Processing: { label: "قيد التنفيذ", cls: "bg-blue-500/15 text-blue-400" },
  Completed: { label: "مكتمل", cls: "bg-emerald-500/15 text-emerald-400" },
  InProgress: { label: "جارٍ", cls: "bg-blue-500/15 text-blue-400" },
  Partial: { label: "جزئي", cls: "bg-purple-500/15 text-purple-400" },
  Canceled: { label: "ملغي", cls: "bg-red-500/15 text-red-400" },
  Error: { label: "خطأ", cls: "bg-red-500/15 text-red-400" },
};

export default function ResellerOrders({ slug, siteName }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/admin/orders?status=${filter}`, { cache: "no-store" });
        const data = await res.json();
        if (data.orders) setOrders(data.orders);
        else setError(data.error || "فشل التحميل");
      } catch {
        setError("فشل الاتصال");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug, filter]);

  const filters = ["all", "Pending", "Processing", "Completed", "Canceled", "Error"];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">مركز الطلبات</h1>
        <p className="mt-1 text-sm text-zinc-500">جميع طلبات {siteName}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filter === f ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]" : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            {f === "all" ? "الكل" : STATUS_LABELS[f]?.label || f}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-zinc-500">
          <Loader2 size={18} className="animate-spin" /> جاري التحميل...
        </div>
      )}
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div>}

      <div className="space-y-2">
        {orders.map((order) => {
          const st = STATUS_LABELS[order.status] || { label: order.status, cls: "bg-white/10 text-zinc-300" };
          return (
            <div key={order.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
                    <Package size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">#{order.id} — {order.service_name}</div>
                    <div className="mt-0.5 max-w-md truncate text-xs text-zinc-500">{order.link}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                  <span className="text-sm font-black text-[var(--color-primary)]">$ {Number(order.charge).toFixed(2)}</span>
                  <span className="text-xs text-zinc-500">كمية: {order.quantity}</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-zinc-600">{order.created_at}</div>
            </div>
          );
        })}
        {!loading && !error && orders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">لا توجد طلبات</div>
        )}
      </div>
    </div>
  );
}