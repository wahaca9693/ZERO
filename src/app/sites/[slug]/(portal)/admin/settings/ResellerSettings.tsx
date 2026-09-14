"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, Check, CreditCard, Palette } from "lucide-react";

type Props = { slug: string; siteName: string };

type PaymentMethod = { name: string; instructions: string; enabled: boolean };

export default function ResellerSettingsPage({ slug, siteName }: Props) {
  const base = `/api/sites/${encodeURIComponent(slug)}`;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [theme, setTheme] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${base}/admin/settings`, { cache: "no-store" });
        const data = await res.json();
        if (data.paymentMethods) setMethods(data.paymentMethods);
        if (data.theme) setTheme(data.theme);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [base]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${base}/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, paymentMethods: methods }),
      });
      const data = await res.json();
      if (data.success) setMessage({ text: "تم حفظ الإعدادات بنجاح" });
      else setMessage({ text: data.error || "فشل الحفظ", error: true });
    } catch {
      setMessage({ text: "تعذر الاتصال بالخادم", error: true });
    } finally {
      setSaving(false);
    }
  };

  const updateMethod = (index: number, key: keyof PaymentMethod, value: string | boolean) => {
    setMethods((prev) => prev.map((m, i) => (i === index ? { ...m, [key]: value } : m)));
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">إعدادات {siteName}</h1>
        <p className="mt-1 text-sm text-zinc-400">تحكم كامل — بوابات الدفع، الهوية، وكل خصائص منصتك</p>
      </div>

      {/* Payment gateways */}
      <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><CreditCard size={18} /></span>
            <div>
              <h2 className="font-black text-white">بوابات الدفع</h2>
              <p className="text-xs text-zinc-500">الطرق التي تظهر لعملائك في صفحة الشحن</p>
            </div>
          </div>
          <button onClick={() => setMethods((prev) => [...prev, { name: "", instructions: "", enabled: true }])} className="flex items-center gap-1 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-500/25">
            <Plus size={14} /> إضافة
          </button>
        </div>

        <div className="space-y-3">
          {methods.length === 0 && (
            <p className="rounded-xl bg-white/[0.03] p-4 text-sm text-zinc-500">لا توجد طرق دفع — أضف طريقة جديدة</p>
          )}
          {methods.map((method, index) => (
            <div key={index} className="grid gap-2 rounded-2xl border border-white/5 bg-[#141414] p-3 sm:grid-cols-[1fr_1.5fr_auto_auto]">
              <input value={method.name} onChange={(e) => updateMethod(index, "name", e.target.value)} placeholder="اسم الطريقة (مثال: آسياسيل، تحويل)" className="rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40" />
              <input value={method.instructions} onChange={(e) => updateMethod(index, "instructions", e.target.value)} placeholder="التعليمات أو رقم الحساب" className="rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40" />
              <label className="flex items-center gap-1 text-xs text-zinc-400">
                <input type="checkbox" checked={method.enabled} onChange={(e) => updateMethod(index, "enabled", e.target.checked)} /> مفعلة
              </label>
              <button onClick={() => setMethods((prev) => prev.filter((_, i) => i !== index))} className="rounded-lg bg-red-500/10 px-2 text-red-300 hover:bg-red-500/20"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </section>

      {/* Site identity */}
      <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400"><Palette size={18} /></span>
          <div>
            <h2 className="font-black text-white">هوية الموقع</h2>
            <p className="text-xs text-zinc-500">اسم الموقع الظاهر</p>
          </div>
        </div>
        <input
          value={String(theme.siteName || "")}
          onChange={(e) => setTheme((prev) => ({ ...prev, siteName: e.target.value }))}
          placeholder="اسم الموقع (مثال: متجري للخدمات)"
          className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/40"
        />
      </section>

      {message && (
        <div className={`rounded-2xl p-4 text-sm font-bold ${message.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {message.error ? "✕ " : <Check size={16} className="ml-1 inline" />}{message.text}
        </div>
      )}

      <button onClick={save} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-black text-black disabled:opacity-50">
        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
        حفظ الإعدادات
      </button>
    </div>
  );
}