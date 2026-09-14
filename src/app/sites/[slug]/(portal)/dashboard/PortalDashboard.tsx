"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Boxes, ShoppingCart, Sparkles, Clock } from "lucide-react";

type Props = { slug: string; siteName: string };

type Order = { id: number; service_name?: string; status: string; created_at?: string; quantity?: number; charge?: number };

type DashboardData = {
  user: { username: string; balance: number };
  recentOrders: Order[];
  activeOrders: number;
  totalOrders: number;
};

export default function PortalDashboard({ slug, siteName }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, ordersRes] = await Promise.all([
          fetch(`/api/sites/${encodeURIComponent(slug)}/auth/me`, { cache: "no-store" }),
          fetch(`/api/sites/${encodeURIComponent(slug)}/orders`, { cache: "no-store" }),
        ]);
        const me = await meRes.json();
        const ordersData = await ordersRes.json();
        const orders: Order[] = Array.isArray(ordersData.orders) ? ordersData.orders : [];
        const active = orders.filter((o) => ["Pending", "processing", "in_progress", "partial"].includes(String(o.status))).length;
        setData({
          user: me.authenticated ? me.user : { username: siteName, balance: 0 },
          recentOrders: orders.slice(0, 5),
          activeOrders: active,
          totalOrders: orders.length,
        });
      } catch {}
    };
    void load();
  }, [slug, siteName]);

  const balance = Number(data?.user?.balance ?? 0);

  return (
    <div className="space-y-5">
      {/* Welcome card */}
      <div className="rounded-3xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-gold)] text-[#111]">
          <Sparkles size={26} />
        </div>
        <h1 className="text-xl font-black text-white">أهلاً بعودتك، {data?.user?.username || siteName}</h1>
        <p className="mt-1 text-sm text-zinc-400">متابعة طلباتك وإدارة عملياتك بسهولة</p>
      </div>

      {/* Balance card */}
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-zinc-400">الرصيد الحالي</span>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-500">تحديث مباشر</span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-5xl font-black tracking-tight text-white">${balance.toFixed(2)}</span>
          <span className="text-lg font-bold text-zinc-500">USD</span>
        </div>
        <Link
          href={`/sites/${encodeURIComponent(slug)}/wallet`}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-3 font-black text-black hover:brightness-110"
        >
          <Wallet size={18} /> إدارة المحفظة
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4 text-center">
          <p className="text-2xl font-black text-white">{data?.totalOrders ?? 0}</p>
          <p className="mt-1 text-xs font-bold text-zinc-500">إجمالي الطلبات</p>
        </div>
        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-4 text-center">
          <p className="text-2xl font-black text-[var(--color-gold)]">{data?.activeOrders ?? 0}</p>
          <p className="mt-1 text-xs font-bold text-zinc-500">طلبات نشطة</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href={`/sites/${encodeURIComponent(slug)}/services`}
          className="flex flex-col items-center gap-2 rounded-3xl border border-white/5 bg-white/[0.03] p-6 text-center transition hover:border-[var(--color-gold)]/40 hover:bg-white/[0.06]"
        >
          <Boxes size={26} className="text-[var(--color-primary)]" />
          <span className="font-black text-white">متجر الخدمات</span>
          <span className="text-xs text-zinc-500">تصفح واطلب الخدمات</span>
        </Link>
        <Link
          href={`/sites/${encodeURIComponent(slug)}/orders`}
          className="flex flex-col items-center gap-2 rounded-3xl border border-white/5 bg-white/[0.03] p-6 text-center transition hover:border-[var(--color-gold)]/40 hover:bg-white/[0.06]"
        >
          <ShoppingCart size={26} className="text-[var(--color-gold)]" />
          <span className="font-black text-white">طلباتي</span>
          <span className="text-xs text-zinc-500">متابعة حالة الطلبات</span>
        </Link>
      </div>

      {/* Recent orders */}
      {data && data.recentOrders.length > 0 && (
        <div className="rounded-3xl border border-white/5 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
            <span className="text-sm font-black text-white">أحدث الطلبات</span>
            <Link href={`/sites/${encodeURIComponent(slug)}/orders`} className="text-xs font-bold text-[var(--color-primary)]">
              عرض الكل
            </Link>
          </div>
          {data.recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between border-b border-white/5 px-5 py-3 last:border-0">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
                  <Clock size={16} />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{order.service_name || `طلب #${order.id}`}</p>
                  <p className="text-xs text-zinc-500">#{order.id} · {order.quantity ?? 0} وحدة</p>
                </div>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-zinc-300">{order.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}