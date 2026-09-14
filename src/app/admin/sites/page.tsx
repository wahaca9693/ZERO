"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { useInitialAuthUser } from "@/app/components/Providers";
import { Copy, Check, ExternalLink, Globe2, Loader2, Shield, Users, ShoppingBag, Lock, Banknote } from "lucide-react";

type SiteRow = {
  id: number;
  slug: string;
  displayName: string;
  status: string;
  subscriptionStatus: string;
  subscriptionPrice: number;
  subscriptionCurrency: string;
  createdAt: string | null;
  ownerUserId: number;
  ownerUsername: string | null;
  ownerEmail: string | null;
  ownerBalance: number;
  customers: number;
  orders: number;
  publicUrl: string;
  adminUrl: string;
};

export default function AdminSitesPage() {
  const user = useInitialAuthUser();
  const [sites, setSites] = useState<SiteRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/sites", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "غير مصرح"); }
        else if (Array.isArray(data.sites)) setSites(data.sites);
      } catch { setError("تعذر التحميل"); }
      finally { setLoading(false); }
    };
    void load();
  }, []);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <DashboardLayout user={user}>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400"><Shield size={22} /></span>
          <div>
            <h1 className="text-2xl font-black text-white">جميع المنصات الفرعية</h1>
            <p className="text-sm text-zinc-400">الروابط والمالكين والإحصائيات — مرئية للأدمن فقط</p>
          </div>
        </div>

        {error && <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
        {loading && <div className="flex justify-center py-16 text-zinc-500"><Loader2 className="animate-spin" size={24} /></div>}

        {!loading && sites && sites.length === 0 && (
          <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-10 text-center">
            <Globe2 className="mx-auto mb-3 text-zinc-600" size={40} />
            <p className="font-black text-white">لا توجد منصات فرعية بعد</p>
          </div>
        )}

        {!loading && sites && (
          <div className="grid gap-4 md:grid-cols-2">
            {sites.map((site) => (
              <div key={site.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-white">{site.displayName}</p>
                    <p className="text-xs font-bold text-zinc-500" dir="ltr">{site.slug}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${site.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {site.status === "active" ? "نشط" : "موقوف"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-zinc-400">
                  <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1"><Users size={12} /> {site.customers} عميل</span>
                  <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1"><ShoppingBag size={12} /> {site.orders} طلب</span>
                  <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1"><Banknote size={12} /> رصيد المالك: ${site.ownerBalance.toFixed(2)}</span>
                </div>

                <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-xs text-zinc-400">
                  <p className="font-black text-zinc-300">المالك</p>
                  <p className="mt-1">@{site.ownerUsername || "—"}{site.ownerEmail ? ` · ${site.ownerEmail}` : ""}</p>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#141414] p-2.5">
                    <ExternalLink size={13} className="shrink-0 text-zinc-500" />
                    <a href={site.publicUrl} target="_blank" rel="noreferrer" dir="ltr" className="flex-1 truncate text-xs text-[var(--color-primary)] hover:underline">{site.publicUrl}</a>
                    <button onClick={() => copy(site.publicUrl, `p-${site.id}`)} className="rounded-md bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10">
                      {copied === `p-${site.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#141414] p-2.5">
                    <Lock size={13} className="shrink-0 text-zinc-500" />
                    <a href={site.adminUrl} target="_blank" rel="noreferrer" dir="ltr" className="flex-1 truncate text-xs text-amber-400 hover:underline">{site.adminUrl}</a>
                    <button onClick={() => copy(site.adminUrl, `a-${site.id}`)} className="rounded-md bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10">
                      {copied === `a-${site.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}