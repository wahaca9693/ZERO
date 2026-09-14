"use client";

import { useEffect, useState } from "react";
import { UserRound, Mail, WalletCards, ShieldCheck, Loader2 } from "lucide-react";

type Props = { slug: string; siteName: string };

type User = { id: number; username: string; email: string; balance: number; role: string };

export default function PortalProfile({ slug, siteName }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/auth/me`, { cache: "no-store" });
        const data = await res.json();
        if (data.authenticated) setUser(data.user);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-400">
        <Loader2 className="ml-2 animate-spin" size={20} /> جارٍ التحميل...
      </div>
    );
  }

  if (!user) return <p className="py-10 text-center text-zinc-500">تعذر تحميل بيانات الحساب.</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">الملف الشخصي</h1>
        <p className="mt-1 text-sm text-zinc-400">بيانات حسابك داخل {siteName}</p>
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">
        <div className="mb-5 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-gold)] text-2xl font-black text-[#111]">
            {user.username.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-xl font-black text-white">{user.username}</p>
            <p className="text-sm text-zinc-400">{user.role === "admin" ? "مدير الموقع" : "عميل"}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3.5">
            <UserRound size={18} className="text-[var(--color-primary)]" />
            <div className="flex-1">
              <p className="text-xs text-zinc-500">اسم المستخدم</p>
              <p className="text-sm font-bold text-white">{user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3.5">
            <Mail size={18} className="text-[var(--color-primary)]" />
            <div className="flex-1">
              <p className="text-xs text-zinc-500">البريد الإلكتروني</p>
              <p className="text-sm font-bold text-white">{user.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3.5">
            <WalletCards size={18} className="text-[var(--color-primary)]" />
            <div className="flex-1">
              <p className="text-xs text-zinc-500">الرصيد الحالي</p>
              <p className="text-sm font-black text-white">${Number(user.balance || 0).toFixed(2)} USD</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3.5">
            <ShieldCheck size={18} className="text-emerald-400" />
            <div className="flex-1">
              <p className="text-xs text-zinc-500">حالة الحساب</p>
              <p className="text-sm font-bold text-emerald-400">نشط</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}