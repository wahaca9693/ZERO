"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ShoppingCart, ArrowDownUp, TrendingUp, LayoutDashboard, ShieldCheck, Loader2 } from "lucide-react";

type Props = { slug: string; siteName: string };

type Stats = {
  users: number;
  orders: number;
  ordersTotal: number;
  txCount: number;
  txTotal: number;
};

export default function ResellerAdminPage({ slug, siteName }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const base = `/sites/${encodeURIComponent(slug)}`;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/admin/analytics`, { cache: "no-store" });
        const data = await res.json();
        if (data.stats) setStats(data.stats);
        else setError(data.error || "فشل تحميل الإحصائيات");
      } catch {
        setError("فشل الاتصال");
      }
    };
    void load();
  }, [slug]);

  const cards = [
    { label: "المستخدمون", value: stats?.users ?? "—", icon: Users, color: "text-blue-400", href: `${base}/admin/users` },
    { label: "الطلبات", value: stats?.orders ?? "—", icon: ShoppingCart, color: "text-orange-400", href: `${base}/admin/orders` },
    { label: "حجم الطلبات ($)", value: stats ? `$${Number(stats.ordersTotal).toFixed(2)}` : "—", icon: TrendingUp, color: "text-emerald-400", href: `${base}/admin/orders` },
    { label: "المعاملات", value: stats?.txCount ?? "—", icon: ArrowDownUp, color: "text-purple-400", href: `${base}/transactions` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">لوحة إدارة {siteName}</h1>
          <p className="mt-1 text-sm text-zinc-500">إدارة كاملة لمنصتك الفرعية — المستخدمون والطلبات والأرصدة</p>
        </div>
        <span className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-bold text-emerald-400">
          <ShieldCheck size={16} /> أدمن
        </span>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div>
      )}

      {!stats && !error && (
        <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
          <Loader2 size={18} className="animate-spin" /> جاري تحميل الإحصائيات...
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-[var(--color-primary)]/40 hover:bg-white/[0.06]"
            >
              <card.icon size={20} className={card.color} />
              <div className="mt-3 text-2xl font-black text-white">{card.value}</div>
              <div className="mt-1 text-xs font-bold text-zinc-500">{card.label}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`${base}/admin/users`} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-[var(--color-primary)]/40 hover:bg-white/[0.06]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <Users size={22} />
          </div>
          <div>
            <div className="font-black text-white">إدارة المستخدمين</div>
            <div className="mt-0.5 text-xs text-zinc-500">عرض وإضافة وخصم الأرصدة، حظر الحسابات</div>
          </div>
        </Link>
        <Link href={`${base}/admin/orders`} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-[var(--color-primary)]/40 hover:bg-white/[0.06]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
            <ShoppingCart size={22} />
          </div>
          <div>
            <div className="font-black text-white">مركز الطلبات</div>
            <div className="mt-0.5 text-xs text-zinc-500">مراجعة جميع طلبات منصتك وحالاتها</div>
          </div>
        </Link>
        <Link href={`${base}/dashboard`} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-[var(--color-primary)]/40 hover:bg-white/[0.06]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <div className="font-black text-white">لوحة التحكم</div>
            <div className="mt-0.5 text-xs text-zinc-500">العودة لتجربة المستخدم العادي</div>
          </div>
        </Link>
      </div>
    </div>
  );
}