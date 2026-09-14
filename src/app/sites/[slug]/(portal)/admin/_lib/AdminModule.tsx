"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Plus, Trash2, Check, X, KeyRound, Ticket, Gift, BellRing, BarChart3, Globe2, Package, ListChecks, FolderCog, Send, Power } from "lucide-react";

type Props = {
  slug: string;
  title: string;
  description: string;
  endpoint: string;
  icon?: "tickets" | "gift" | "notifications" | "api" | "audit" | "health" | "free" | "navigation" | "crypto" | "asiacell" | "providers";
  createLabel?: string;
  createFields?: Array<{ key: string; label: string; type?: "text" | "number" | "textarea" | "select"; options?: string[] }>;
};

const ICONS: Record<string, typeof Ticket> = {
  tickets: Ticket, gift: Gift, notifications: BellRing, api: KeyRound, audit: ListChecks,
  health: BarChart3, free: Package, navigation: Globe2, crypto: FolderCog, asiacell: Power, providers: Package,
};

type Row = Record<string, unknown>;

export default function ResellerAdminModule({ slug, title, description, endpoint, icon = "tickets", createLabel, createFields }: Props) {
  const base = `/api/sites/${encodeURIComponent(slug)}${endpoint}`;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(base, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "فشل التحميل"); setRows([]); }
      else {
        const key = Object.keys(data).find((k) => Array.isArray((data as Record<string, unknown>)[k]));
        setRows(key ? (data as Record<string, Row[]>)[key] : []);
      }
    } catch { setError("فشل الاتصال"); setRows([]); }
    finally { setLoading(false); }
  }, [base]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!createFields) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) { setFlash({ text: data.message || "تمت الإضافة بنجاح" }); setForm({}); await load(); }
      else setFlash({ text: data.error || "فشلت العملية", error: true });
    } catch { setFlash({ text: "تعذر الاتصال", error: true }); }
    finally { setBusy(false); }
  };

  const act = async (body: Record<string, unknown>, successText: string) => {
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { setFlash({ text: successText }); await load(); }
      else setFlash({ text: data.error || "فشلت العملية", error: true });
    } catch { setFlash({ text: "تعذر الاتصال", error: true }); }
    finally { setBusy(false); }
  };

  const Icon = ICONS[icon] || Ticket;
  const total = rows.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]"><Icon size={22} /></span>
          <div>
            <h1 className="text-2xl font-black text-white">{title}</h1>
            <p className="mt-0.5 text-sm text-zinc-400">{description}</p>
          </div>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-1 rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10"><RefreshCw size={13} /> تحديث</button>
      </div>

      {error && <div className="rounded-2xl bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div>}
      {flash && <div className={`rounded-2xl p-3 text-sm font-bold ${flash.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{flash.error ? <X size={14} className="ml-1 inline" /> : <Check size={14} className="ml-1 inline" />}{flash.text}</div>}

      {createFields && (
        <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
          <h2 className="mb-3 font-black text-white">{createLabel || "إضافة جديدة"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {createFields.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-bold text-zinc-400">{field.label}</label>
                {field.type === "select" ? (
                  <select value={form[field.key] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--color-primary)]/40">
                    <option value="">— اختر —</option>
                    {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea value={form[field.key] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} rows={3} className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--color-primary)]/40" />
                ) : (
                  <input type={field.type === "number" ? "number" : "text"} value={form[field.key] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--color-primary)]/40" />
                )}
              </div>
            ))}
          </div>
          <button onClick={() => void create()} disabled={busy} className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-black disabled:opacity-50">
            {busy ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
            {createLabel || "إضافة"}
          </button>
        </section>
      )}

      <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black text-white">السجلات ({total})</h2>
        </div>
        {loading && <div className="flex justify-center py-10 text-zinc-500"><Loader2 className="animate-spin" size={22} /></div>}
        {!loading && rows.length === 0 && <p className="rounded-xl bg-white/[0.03] p-4 text-sm text-zinc-500">لا توجد بيانات بعد</p>}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-right text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold text-zinc-500">
                  {Object.keys(rows[0]).filter((k) => !["id"].includes(k)).map((k) => <th key={k} className="px-3 py-2">{k}</th>)}
                  <th className="px-3 py-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 text-zinc-300">
                    {Object.entries(row).filter(([k]) => k !== "id").map(([k, v]) => (
                      <td key={k} className="px-3 py-2.5">
                        {typeof v === "boolean" ? (v ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">مفعل</span> : <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">معطل</span>) : String(v ?? "—")}
                      </td>
                    ))}
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        {typeof row.enabled !== "undefined" && (
                          <button onClick={() => void act({ action: "toggle", id: row.id }, "تم التبديل")} className="rounded-lg bg-white/5 p-1.5 text-zinc-300 hover:bg-white/10"><Power size={13} /></button>
                        )}
                        <button onClick={() => void act({ action: "delete", id: row.id }, "تم الحذف")} className="rounded-lg bg-red-500/10 p-1.5 text-red-300 hover:bg-red-500/20"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}