"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Power, Trash2, RefreshCw, Eye, EyeOff, EyeOff as Hide, ChevronDown, ChevronUp, Search } from "lucide-react";

type Props = { slug: string };

type Provider = {
  id: number;
  name: string;
  api_endpoint: string;
  api_key: string;
  owner_user_id: number;
  is_active: number;
};

type ProviderService = {
  id: number;
  remote_service_id: string;
  name: string;
  rate: number;
  category: string;
  is_hidden: number;
};

export default function BranchProvidersPage({ slug }: Props) {
  const base = `/api/sites/${encodeURIComponent(slug)}`;
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", api_endpoint: "https://www.follower4.zone.id/api/v2", api_key: "" });
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [services, setServices] = useState<Record<number, ProviderService[]>>({});
  const [servicesLoading, setServicesLoading] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState<Record<number, string>>({});

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetch(`${base}/providers`, { cache: "no-store" });
      const data = await res.json();
      if (data.providers) setProviders(data.providers);
    } catch {}
    finally { setLoading(false); }
  }, [base]);

  useEffect(() => { void loadProviders(); }, [loadProviders]);

  const loadServices = async (providerId: number) => {
    setServicesLoading((s) => ({ ...s, [providerId]: true }));
    try {
      const res = await fetch(`${base}/providers?provider_id=${providerId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.services) setServices((s) => ({ ...s, [providerId]: data.services }));
    } catch {}
    finally { setServicesLoading((s) => ({ ...s, [providerId]: false })); }
  };

  const toggleExpand = (id: number) => {
    setExpanded((cur) => {
      const next = cur === id ? null : id;
      if (next && !services[id]) void loadServices(id);
      return next;
    });
  };

  const addProvider = async () => {
    if (!form.name.trim() || !form.api_key.trim()) {
      setMsg({ text: "اسم المزود والمفتاح مطلوبان", error: true });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${base}/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, api_endpoint: form.api_endpoint, api_key: form.api_key }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg({ text: `✅ ${data.message} (${data.provider_id})` });
        setShowAdd(false);
        setForm({ name: "", api_endpoint: "https://www.follower4.zone.id/api/v2", api_key: "" });
        await loadProviders();
      } else {
        setMsg({ text: String(data.error || "فشل ربط المزود"), error: true });
      }
    } catch {
      setMsg({ text: "تعذر الاتصال بالخادم", error: true });
    } finally {
      setBusy(false);
    }
  };

  const toggleProvider = async (p: Provider) => {
    const res = await fetch(`${base}/providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", provider_id: p.id }),
    });
    if (res.ok) { await loadProviders(); }
  };

  const deleteProvider = async (p: Provider) => {
    if (!confirm(`حذف المزود "${p.name}" وجميع خدماته؟`)) return;
    const res = await fetch(`${base}/providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", provider_id: p.id }),
    });
    if (res.ok) {
      setExpanded(null);
      await loadProviders();
    }
  };

  const refreshProvider = async (p: Provider) => {
    setBusy(true);
    const res = await fetch(`${base}/providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh", provider_id: p.id }),
    });
    const data = await res.json();
    setMsg({ text: data.message || data.error || "تم" , error: !res.ok });
    setBusy(false);
    if (expanded === p.id) await loadServices(p.id);
  };

  const toggleService = async (p: Provider, svc: ProviderService) => {
    const newHidden = svc.is_hidden === 1 ? false : true;
    const res = await fetch(`${base}/providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hide", provider_id: p.id, service_id: svc.remote_service_id, hidden: newHidden }),
    });
    if (res.ok) {
      setServices((s) => ({
        ...s,
        [p.id]: (s[p.id] || []).map((x) => x.id === svc.id ? { ...x, is_hidden: newHidden ? 1 : 0 } : x),
      }));
    }
  };

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ التحميل...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">المزودون والخدمات</h1>
          <p className="mt-1 text-sm text-zinc-400">أضف أكثر من مزود، جلب خدماته، واربطها بمنصتك</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-black text-black">
          <Plus size={16} /> إضافة مزود
        </button>
      </div>

      {msg && <div className={`rounded-2xl p-4 text-sm font-bold ${msg.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{msg.text}</div>}

      {showAdd && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 font-black text-white">ربط مزود جديد</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">اسم المزود (للحفظ)</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: مزود 1" className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-[var(--color-primary)]/40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">رابط API المزود</label>
              <input dir="ltr" value={form.api_endpoint} onChange={(e) => setForm({ ...form, api_endpoint: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-left text-white outline-none focus:border-[var(--color-primary)]/40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-400">مفتاح API الخاص بالمزود</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  dir="ltr"
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  placeholder="smm-..."
                  className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-left text-white outline-none focus:border-[var(--color-primary)]/40 pl-12"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button onClick={() => void addProvider()} disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-black disabled:opacity-50">
              {busy ? <Loader2 className="animate-spin" size={15} /> : <><RefreshCw size={15} /> ربط وجلب الخدمات</>}
            </button>
            <p className="text-xs text-zinc-500">عند الربط: يتحقق النظام من المفتاح ثم يجلب جميع الخدمات من المزود تلقائياً</p>
          </div>
        </section>
      )}

      {providers.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-10 text-center">
          <p className="text-zinc-400">لا يوجد مزودون مرتبطون بعد — أضف أول مزود</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div key={p.id} className={`rounded-3xl border p-4 ${p.is_active === 1 ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-red-500/20 bg-red-500/[0.04]"}`}>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-white">{p.name}</p>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.is_active === 1 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      {p.is_active === 1 ? "مفعل" : "متوقف"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500" dir="ltr">{p.api_endpoint}</p>
                  <p className="text-xs text-zinc-500" dir="ltr">Key: {p.api_key}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => void toggleProvider(p)} title={p.is_active === 1 ? "إيقاف" : "تفعيل"} className="rounded-lg bg-white/5 p-2 text-zinc-300 hover:bg-white/10">
                    <Power size={16} />
                  </button>
                  <button onClick={() => void refreshProvider(p)} title="تحديث الخدمات" className="rounded-lg bg-white/5 p-2 text-zinc-300 hover:bg-white/10">
                    <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
                  </button>
                  <button onClick={() => void deleteProvider(p)} title="حذف" className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => toggleExpand(p.id)} title="الخدمات" className="rounded-lg bg-white/5 p-2 text-zinc-300 hover:bg-white/10">
                    {expanded === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {expanded === p.id && (
                <div className="mt-3 border-t border-white/5 pt-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Search size={14} className="text-zinc-500" />
                    <input
                      value={search[p.id] || ""}
                      onChange={(e) => setSearch({ ...search, [p.id]: e.target.value })}
                      placeholder="ابحث عن خدمة..."
                      className="flex-1 rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  {servicesLoading[p.id] ? (
                    <div className="flex items-center justify-center py-6 text-zinc-400"><Loader2 className="ml-2 animate-spin" size={16} /> جارٍ جلب الخدمات...</div>
                  ) : (
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                      {(services[p.id] || [])
                        .filter((s) => !search[p.id] || s.name.toLowerCase().includes((search[p.id] || "").toLowerCase()))
                        .slice(0, 100)
                        .map((s) => (
                          <div key={s.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${s.is_hidden === 1 ? "opacity-50" : "bg-white/[0.02]"}`}>
                            <span className="flex-1 text-zinc-300">{s.name}</span>
                            <span className="text-zinc-500" dir="ltr">${Number(s.rate).toFixed(3)}</span>
                            <button onClick={() => void toggleService(p, s)} title={s.is_hidden === 1 ? "إظهار" : "إخفاء"} className="rounded p-1 text-zinc-400 hover:text-white">
                              <Hide size={13} />
                            </button>
                          </div>
                        ))}
                      {(services[p.id] || []).length === 0 && <p className="py-4 text-center text-xs text-zinc-500">لا توجد خدمات — اضغط تحديث</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}