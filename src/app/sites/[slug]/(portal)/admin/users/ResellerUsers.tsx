"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, Minus, Plus, Ban, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

type Props = { slug: string; siteName: string };

type ResellerUserRow = {
  id: number;
  username: string;
  email: string;
  balance: number;
  role: string;
  is_banned: number;
  created_at: string;
};

export default function ResellerUsers({ slug, siteName }: Props) {
  const [users, setUsers] = useState<ResellerUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/admin/users?search=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.users) setUsers(data.users);
      else setError(data.error || "فشل التحميل");
    } catch {
      setError("فشل الاتصال");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const act = async (userId: number, action: string, amount?: number) => {
    setBusyId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, amount: amount ?? 0 }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "تم تنفيذ العملية بنجاح" });
        void load(search);
      } else {
        setMessage({ text: data.error || "فشلت العملية", error: true });
      }
    } catch {
      setMessage({ text: "فشل الاتصال", error: true });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">إدارة المستخدمين</h1>
          <p className="mt-1 text-sm text-zinc-500">حسابات {siteName} — تعديل الأرصدة والحظر</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void load(search); }}
            placeholder="بحث بالاسم أو البريد..."
            className="w-64 rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-9 text-sm text-white outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm font-bold ${message.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {message.text}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-zinc-500">
          <Loader2 size={18} className="animate-spin" /> جاري التحميل...
        </div>
      )}

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div>}

      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${user.is_banned ? "border-red-500/20 bg-red-500/5" : "border-white/5 bg-white/[0.03]"}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 font-black text-[var(--color-primary)]">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 font-black text-white">
                  {user.username}
                  {user.role === "admin" && <ShieldCheck size={14} className="text-[var(--color-primary)]" />}
                  {user.is_banned === 1 && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">محظور</span>}
                </div>
                <div className="text-xs text-zinc-500">{user.email || "—"}</div>
              </div>
            </div>
            <div className="text-sm font-black text-[var(--color-primary)]">$ {Number(user.balance).toFixed(4)}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void act(user.id, "add", 5)}
                disabled={busyId === user.id}
                className="flex h-9 items-center gap-1 rounded-xl bg-emerald-500/15 px-3 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/25 disabled:opacity-50"
                title="إضافة $5"
              >
                <Plus size={14} /> 5
              </button>
              <button
                onClick={() => void act(user.id, "deduct", 5)}
                disabled={busyId === user.id}
                className="flex h-9 items-center gap-1 rounded-xl bg-red-500/15 px-3 text-xs font-bold text-red-400 transition hover:bg-red-500/25 disabled:opacity-50"
                title="خصم $5"
              >
                <Minus size={14} /> 5
              </button>
              {user.is_banned === 1 ? (
                <button
                  onClick={() => void act(user.id, "unban")}
                  disabled={busyId === user.id}
                  className="flex h-9 items-center gap-1 rounded-xl bg-emerald-500/15 px-3 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> رفع الحظر
                </button>
              ) : (
                <button
                  onClick={() => void act(user.id, "ban")}
                  disabled={busyId === user.id}
                  className="flex h-9 items-center gap-1 rounded-xl bg-red-500/10 px-3 text-xs font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Ban size={14} /> حظر
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && !error && users.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
            لا يوجد مستخدمون بعد
          </div>
        )}
      </div>
    </div>
  );
}