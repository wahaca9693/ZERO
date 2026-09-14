"use client";

import { useEffect, useState } from "react";
import { Copy, Check, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";

type Props = { slug: string };

type ApiKey = { id: number; name: string; key: string; enabled: boolean; createdAt: string };

export default function BranchApiAccessPage({ slug }: Props) {
  const base = `/api/sites/${encodeURIComponent(slug)}/admin/api-keys`;
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const load = async () => {
    try {
      const res = await fetch(base, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.keys)) setKeys(data.keys);
    } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [base]);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); window.setTimeout(() => setCopied(null), 1500); } catch {}
  };

  const create = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (res.ok) { setMsg({ text: "تم إنشاء المفتاح بنجاح" }); setName(""); await load(); }
      else setMsg({ text: data.error || "فشل", error: true });
    } catch { setMsg({ text: "تعذر الاتصال", error: true }); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    await load();
  };

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ التحميل...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">بوابة API</h1>
        <p className="mt-1 text-sm text-zinc-400">مفاتيح API الخاصة بمنصتك — تربط تطبيقاتك بمنصتك مباشرة</p>
      </div>
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم التطبيق (مثال: موقعي)" className="flex-1 rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]/40" />
          <button onClick={() => void create()} disabled={busy} className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-black text-black disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />} إنشاء</button>
        </div>
      </div>
      {msg && <div className={`rounded-2xl p-3 text-sm font-bold ${msg.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{msg.text}</div>}
      <div className="space-y-3">
        {keys.length === 0 && <p className="rounded-3xl border border-white/5 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">لا توجد مفاتيح بعد — أنشئ مفتاحك الأول.</p>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 rounded-3xl border border-white/5 bg-white/[0.03] p-4">
            <KeyRound size={18} className="shrink-0 text-[var(--color-primary)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">{k.name}</p>
              <p dir="ltr" className="truncate font-mono text-xs text-zinc-500">{k.key}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${k.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{k.enabled ? "مفعل" : "معطل"}</span>
            <button onClick={() => copy(k.key, `k-${k.id}`)} className="rounded-lg bg-white/5 p-2 text-zinc-400 hover:bg-white/10">{copied === `k-${k.id}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}</button>
            <button onClick={() => void remove(k.id)} className="rounded-lg bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}