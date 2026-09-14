"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Globe2, Loader2, ExternalLink } from "lucide-react";

type Props = { slug: string; siteName: string };

export default function BranchResellerPage({ slug, siteName }: Props) {
  const [site, setSite] = useState<{ publicUrl: string; adminUrl: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/sites`, { cache: "no-store" });
        const data = await res.json();
        const origin = window.location.origin;
        setSite({
          displayName: siteName,
          publicUrl: `${origin}/sites/${slug}`,
          adminUrl: `${origin}/sites/${slug}/admin`,
        });
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [slug, siteName]);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); window.setTimeout(() => setCopied(null), 1500); } catch {}
  };

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="animate-spin" size={20} /> جارٍ التحميل...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">منصتك — {siteName}</h1>
        <p className="mt-1 text-sm text-zinc-400">هذه منصتك الفرعية التي أنشأتها. رابطها محفوظ في حسابك.</p>
      </div>
      <div className="rounded-3xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-gold)] text-[#111]"><Globe2 size={26} /></div>
        <h2 className="text-lg font-black text-white">{siteName}</h2>
        <p className="mt-1 text-sm text-zinc-400">/{slug}</p>
      </div>
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
        <p className="mb-2 text-xs font-bold text-zinc-500">الرابط العام</p>
        <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#141414] p-3">
          <ExternalLink size={15} className="shrink-0 text-zinc-500" />
          <a href={site?.publicUrl} target="_blank" rel="noreferrer" dir="ltr" className="flex-1 truncate text-sm text-[var(--color-primary)] hover:underline">{site?.publicUrl}</a>
          <button onClick={() => copy(site?.publicUrl || "", "pub")} className="rounded-lg bg-white/5 p-2 text-zinc-400 hover:bg-white/10">{copied === "pub" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}</button>
        </div>
        <p className="mb-2 mt-4 text-xs font-bold text-zinc-500">رابط الأدمن</p>
        <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#141414] p-3">
          <ExternalLink size={15} className="shrink-0 text-zinc-500" />
          <a href={site?.adminUrl} target="_blank" rel="noreferrer" dir="ltr" className="flex-1 truncate text-sm text-amber-400 hover:underline">{site?.adminUrl}</a>
          <button onClick={() => copy(site?.adminUrl || "", "adm")} className="rounded-lg bg-white/5 p-2 text-zinc-400 hover:bg-white/10">{copied === "adm" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}</button>
        </div>
      </div>
      <p className="rounded-2xl bg-amber-500/10 p-4 text-center text-xs leading-6 text-amber-300">
        رابط منصتك محفوظ في حسابك ولا يظهر للمستخدمين الآخرين. كل مستخدم مسموح له بإنشاء منصة واحدة فقط.
      </p>
    </div>
  );
}