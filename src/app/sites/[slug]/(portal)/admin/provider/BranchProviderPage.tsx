"use client";

import { useEffect, useState } from "react";
import { Loader2, KeyRound, Save, Check, AlertCircle, Eye, EyeOff } from "lucide-react";

type Props = { slug: string };

export default function BranchProviderPage({ slug }: Props) {
  const base = `/api/sites/${encodeURIComponent(slug)}`;
  const [data, setData] = useState<{
    has_key: boolean;
    api_key: string;
    owner_user_id: number | null;
    is_active: number;
    api_endpoint: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [formKey, setFormKey] = useState("");
  const [formOwner, setFormOwner] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${base}/provider`, { cache: "no-store" });
        const data = await res.json();
        setData(data);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [base]);

  const save = async () => {
    if (!formKey.trim() || !formOwner.trim()) { setMsg({ text: "أكمل جميع الحقول", error: true }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${base}/provider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: formKey.trim(), owner_user_id: Number(formOwner) }),
      });
      const data = await res.json();
      if (res.ok) { setMsg({ text: data.message || "تم الحفظ بنجاح" }); setFormKey(""); setFormOwner(""); await load(); }
      else setMsg({ text: data.error || "فشل الحفظ", error: true });
    } catch { setMsg({ text: "تعذر الاتصال", error: true }); }
    finally { setSaving(false); }
  };

  const load = async () => {
    try {
      const res = await fetch(`${base}/provider`, { cache: "no-store" });
      const data = await res.json();
      setData(data);
    } catch {}
  };

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ التحميل...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">مفتاح API للمنصة</h1>
        <p className="mt-1 text-sm text-zinc-400">أدخل مفتاح API الخاص بك لربط المنصة بالخدمات الرسمية</p>
      </div>

      <div className="rounded-3xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><KeyRound size={20} /></span>
          <div>
            <p className="font-black text-white">Endpoint ثابت</p>
            <p className="text-xs text-zinc-400" dir="ltr">https://www.follower4.zone.id/api/v2</p>
          </div>
        </div>
        <p className="text-xs text-zinc-500">هذا العنوان ثابت ولا يمكن تغييره — تدخل مفتاحك فقط</p>
      </div>

      {msg && <div className={`rounded-2xl p-3 text-sm font-bold ${msg.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{msg.error ? <AlertCircle size={14} className="ml-1 inline" /> : <Check size={14} className="ml-1 inline" />}{msg.text}</div>}

      {!data?.has_key ? (
        <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
          <h2 className="mb-3 font-black text-white">إضافة مفتاح API</h2>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">مفتاح API</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="أدخل مفتاح API الخاص بك"
                  className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]/40 pr-12"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">معرف المستخدم الرسمي (Owner ID)</label>
              <input
                type="number"
                value={formOwner}
                onChange={(e) => setFormOwner(e.target.value)}
                placeholder="مثال: 4"
                className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]/40"
              />
            </div>
          </div>
          <button onClick={() => void save()} disabled={saving} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-black disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
            حفظ وربط المنصة
          </button>
        </section>
      ) : (
        <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><KeyRound size={20} /></span>
            <div className="flex-1">
              <p className="font-black text-white">مفتاح API مربوط</p>
              <p className="text-xs text-zinc-400" dir="ltr">{data.api_key}</p>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-bold bg-emerald-500/15 text-emerald-400">نشط</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">صاحب المفتاح: ID {data.owner_user_id} | Endpoint: <span className="font-mono text-emerald-400" dir="ltr">{data.api_endpoint}</span></p>
        </section>
      )}
    </div>
  );
}