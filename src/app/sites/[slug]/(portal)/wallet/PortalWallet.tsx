"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";

type Props = { slug: string; siteName: string };

export default function PortalWallet({ slug, siteName }: Props) {
  const [user, setUser] = useState<{ balance: number } | null>(null);

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
      <h1 className="text-2xl font-black text-white">المحفظة</h1>
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">
        <div className="flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
            <Wallet size={26} />
          </span>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm font-bold text-zinc-400">الرصيد الحالي</p>
          <p className="mt-2 text-5xl font-black text-white">${Number(user?.balance || 0).toFixed(2)}</p>
          <span className="text-lg font-bold text-zinc-500">USD</span>
        </div>
      </div>
      <p className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center text-sm text-zinc-400">
        الشحن والعمليات المالية لهذا الموقع تتم عبر {siteName}. يرجى التواصل مع إدارة الموقع للشحن والاستلام.
      </p>
    </div>
  );
}