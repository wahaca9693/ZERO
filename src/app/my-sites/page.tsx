"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useInitialAuthUser } from "../../components/Providers";
import { Copy, Check, ExternalLink, Globe2, Loader2, Lock, ScriptKey } from "lucide-react";

type MySite = {
  id: number;
  slug: string;
  displayName: string;
  status: string;
  subscriptionStatus: string;
  publicUrl: string;
  adminUrl: string;
  createdAt: string | null;
};

export default function MySitesPage() {
  const user = useInitialAuthUser();
  const [sites, setSites] = useState<MySite[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/me/sites", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.sites)) setSites(data.sites);
      } catch {}
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
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-black text-white">منصاتي</h1>
          <p className="mt-1 text-sm text-zinc-400">روابط منصاتك المحفوظة — خاصة بك ولا تظهر لأي مستخدم آخر</p>
        </div>

        {loading && <div className="flex justify-center py-16 text-zinc-500"><Loader2 className="animate-spin" size={24} /></div>}

        {!loading && sites && sites.length === 0 && (
          <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-10 text-center">
            <Globe2 className="mx-auto mb-3 text-zinc-600" size={40} />
            <p className="font-black text-white">لا تملك أي منصة بعد</p>
            <p className="mt-1 text-sm text-zinc-500">كل مستخدم يملك منصة واحدة فقط — عند إنشاء منصتك سيظهر رابطها هنا</p>
          </div>
        )}

        {!loading && sites && sites.map((site) => (
          <div key={site.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                  <Globe2 size={22} />
                </span>
                <div>
                  <p className="text-lg font-black text-white">{site.displayName}</p>
                  <p className="text-xs font-bold text-zinc-500">{site.slug}</p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${site.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                {site.status === "active" ? "نشط" : "موقوف"}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#141414] p-3">
                <ExternalLink size={15} className="shrink-0 text-zinc-500" />
                <a href={site.publicUrl} target="_blank" rel="noreferrer" dir="ltr" className="flex-1 truncate text-sm text-[var(--color-primary)] hover:underline">{site.publicUrl}</a>
                <button onClick={() => copy(site.publicUrl, `pub-${site.id}`)} className="rounded-lg bg-white/5 p-2 text-zinc-400 hover:bg-white/10">
                  {copied === `pub-${site.id}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#141414] p-3">
                <Lock size={15} className="shrink-0 text-zinc-500" />
                <a href={site.adminUrl} target="_blank" rel="noreferrer" dir="ltr" className="flex-1 truncate text-sm text-amber-400 hover:underline">{site.adminUrl}</a>
                <button onClick={() => copy(site.adminUrl, `adm-${site.id}`)} className="rounded-lg bg-white/5 p-2 text-zinc-400 hover:bg-white/10">
                  {copied === `adm-${site.id}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
              <ScriptKey size={13} /> هذه الروابط محفوظة في حسابك — لا يراها المستخدمون الآخرون
            </p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}