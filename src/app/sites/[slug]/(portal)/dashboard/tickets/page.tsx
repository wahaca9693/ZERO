"use client";
import { useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";

type Props = { slug: string };
type Ticket = { id: number; subject: string; message: string; status: string; createdAt: string };

export default function TicketsPage({ slug }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/admin/tickets`, { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.tickets)) setTickets(data.tickets);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [slug]);
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-zinc-400"><Loader2 className="ml-2 animate-spin" size={20} /> جارٍ تحميل التذاكر...</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">تذاكر الدعم</h1>
      {tickets.length === 0 && <p className="rounded-3xl border border-white/5 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">لا توجد تذاكر بعد.</p>}
      {tickets.map((t) => (
        <div key={t.id} className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2"><MessageSquare size={16} className="text-[var(--color-primary)]" /><span className="font-black text-white">{t.subject}</span><span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-zinc-400">{t.status}</span></div>
          <p className="mt-2 text-sm text-zinc-400">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
