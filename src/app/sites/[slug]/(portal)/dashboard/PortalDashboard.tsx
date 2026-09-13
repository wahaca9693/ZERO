"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Boxes, ShoppingCart, Sparkles } from "lucide-react";

type Props = { slug: string; siteName: string };

export default function PortalDashboard({ slug, siteName }: Props) {
  const [user, setUser] = useState<{ username: string; balance: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/auth/me`, { cache: "no-store" });
        const data = await res.json();
        if (data.authenticated) setUser(data.user);
      } catch {}
    };
    void load();
  }, [slug]);

  return (
    <div className="space-y-5">
      {/* Welcome card */}
      <div className="rounded-3xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-gold)] text-[#111]">
          <Sparkles size={26} />
        </div>
        <h1 className="text-xl font-black text-white">أهلاً بعودتك، {user?.username || siteName}</h1>
        <p className="mt-1 text-sm text-zinc-400">متابعة طلباتك وإدارة عملياتك بسهولة</p>
      </div>

      {/* Balance card */}
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-zinc-400">الرصيد الحالي</span>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-500">تحديث مباشر</span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-5xl font-black tracking-tight text-white">${Number(user?.balance || 0).toFixed(2)}</span>
          <span className="text-lg font-bold text-zinc-500">USD</span>
        </div>
        <Link
          href={`/sites/${encodeURIComponent(slug)}/wallet`}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-3 font-black text-black hover:brightness-110"
        >
          <Wallet size={18} /> إدارة المحفظة
        </Link>
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
    </div>
  );
}