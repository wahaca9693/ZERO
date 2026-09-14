"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, ExternalLink, Globe2, Copy, Check } from "lucide-react";

type Props = { slug: string; siteName: string };

type SubSite = {
  id: number;
  slug: string;
  displayName: string;
  status: string;
  createdAt: string | null;
  publicUrl: string;
  adminUrl: string;
};

export default function ResellerSitesPage({ slug, siteName }: Props) {
  const base = `/api/sites/${encodeURIComponent(slug)}`;
  const [sites, setSites] = useState<SubSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${base}/sites`, { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.sites)) setSites(data.sites);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [base]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const create = async () => {
    if (!newSlug.trim() || !newName.trim()) { setMessage({ text: "أدخل اسماً واسماً ظاهراً", error: true }); return; }
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch(`${base}/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: newSlug.trim().toLowerCase(), displayName: newName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `تم إنشاء "${data.site.slug}" بنجاح!` });
        setSites((prev) => [{ id: data.site.id, slug: data.site.slug, displayName: data.site.displayName, status: "active", createdAt: null, publicUrl: data.site.publicUrl, adminUrl: data.site.adminUrl }, ...prev]);
        setNewSlug("");
        setNewName("");
      } else {
        setMessage({ text: data.error || "فشل الإنشاء", error: true });
      }
    } catch {
      setMessage({ text: "تعذر الاتصال", error: true });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ تحميل الفروع...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">الفروع الفرعية — {siteName}</h1>
        <p className="mt-1 text-sm text-zinc-400">أنشئ فروع داخل فرعك — كل فرع يعمل بشكل مستقل</p>
      </div>

      {/* Create new sub-site */}
      <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <h2 className="mb-3 font-black text-white">إنشاء فرع فرعي جديد</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="الاسم الفريد (my-store)" className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/40" dir="ltr" />
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="الاسم الظاهر (متجري)" className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/40" />
        </div>
        <button onClick={create} disabled={creating} className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-black disabled:opacity-50">
          {creating ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
          إنشاء الفرع
        </button>
      </section>

      {message && (
        <div className={`rounded-2xl p-3 text-sm font-bold ${message.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {message.text}
        </div>
      )}

      {/* Sub-sites list */}
      <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <h2 className="mb-3 font-black text-white">فروعك ({sites.length})</h2>
        {sites.length === 0 && (
          <p className="rounded-xl bg-white/[0.03] p-4 text-sm text-zinc-500">لم تُنشئ أي فرع فرعي بعد</p>
        )}
        <div className="space-y-3">
          {sites.map((site) => (
            <div key={site.id} className="rounded-2xl border border-white/5 bg-[#141414] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe2 size={16} className="text-emerald-400" />
                  <span className="font-black text-white">{site.displayName}</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">{site.slug}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${site.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{site.status === "active" ? "نشط" : "موقوف"}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl bg-[#0d0d0d] p-2">
                  <ExternalLink size={12} className="shrink-0 text-zinc-500" />
                  <a href={site.publicUrl} target="_blank" rel="noreferrer" dir="ltr" className="flex-1 truncate text-xs text-emerald-400 hover:underline">{site.publicUrl}</a>
                  <button onClick={() => copy(site.publicUrl, `p-${site.id}`)} className="rounded-md bg-white/5 p-1.5 text-zinc-400">
                    {copied === `p-${site.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-[#0d0d0d] p-2">
                  <ExternalLink size={12} className="shrink-0 text-amber-400" />
                  <a href={site.adminUrl} target="_blank" rel="noreferrer" dir="ltr" className="flex-1 truncate text-xs text-amber-400 hover:underline">{site.adminUrl}</a>
                  <button onClick={() => copy(site.adminUrl, `a-${site.id}`)} className="rounded-md bg-white/5 p-1.5 text-zinc-400">
                    {copied === `a-${site.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}