import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Filter, MessageSquare, Clock, CheckCircle2, AlertCircle, Loader2, MoreVertical } from "lucide-react";
import { useState } from "react";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getSiteData(slug: string) {
  await initDb();
  const loaded = await (await import("@/lib/reseller-sites")).loadPublicSite(slug);
  if (!loaded.site) return null;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://cxxv.vercel.app";
  const site = (await import("@/lib/reseller-sites")).publicSiteData(loaded.site, origin, loaded.expired);
  return { site, expired: loaded.expired };
}

export default async function TicketsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSiteData(slug);
  
  if (!data) notFound();
  
  const { site, expired } = data;
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };
  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const siteName = theme.siteName || site.displayName;

  const tickets = [
    { id: "TKT-2024-001", subject: "طلب رقم ORD-002 لم يكتمل", category: "orders", priority: "high", status: "open", messages: 3, lastReply: "2024-01-15 14:30", createdAt: "2024-01-15 10:00" },
    { id: "TKT-2024-002", subject: "استفسار عن طرق الدفع", category: "payments", priority: "normal", status: "closed", messages: 5, lastReply: "2024-01-14 16:20", createdAt: "2024-01-14 09:00" },
    { id: "TKT-2024-003", subject: "مشكلة في شحن الرصيد", category: "wallet", priority: "urgent", status: "open", messages: 2, lastReply: "2024-01-15 11:45", createdAt: "2024-01-15 09:30" },
    { id: "TKT-2024-004", subject: "استفسار عن الأسعار", category: "general", priority: "low", status: "closed", messages: 1, lastReply: "2024-01-12 14:00", createdAt: "2024-01-12 13:45" },
    { id: "TKT-2024-005", subject: "طلب إضافة خدمة جديدة", category: "services", priority: "normal", status: "open", messages: 4, lastReply: "2024-01-14 18:30", createdAt: "2024-01-13 16:00" },
  ];

  const [filter, setFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-6" style={{ "--site-primary": "var(--site-primary)", "--site-secondary": "var(--site-secondary)" } as React.CSSProperties}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">الدعم الفني والتذاكر</h1>
          <p className="text-zinc-400">تواصل مع فريق الدعم لأي استفسارات أو مشاكل</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--site-primary)] px-5 py-3 font-black text-black hover:brightness-110"
        >
          <Plus size={18} /> تذكرة جديدة
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <select className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white outline-none" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">جميع التذاكر</option>
          <option value="open">مفتوحة</option>
          <option value="closed">مغلقة</option>
          <option value="in_progress">قيد المتابعة</option>
        </select>
        <input type="text" placeholder="بحث في التذاكر..." className="w-64 pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--site-primary)]" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">التذكرة</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الموضوع</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">النوع</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الأولوية</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الحالة</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الردود</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">آخر رد</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-white">{ticket.id}</div>
                    <div className="text-xs text-zinc-500">{ticket.createdAt}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-white truncate max-w-xs">{ticket.subject}</div>
                    <div className="text-xs text-zinc-500 capitalize">{ticket.category}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${ticket.category === "wallet" ? "bg-blue-500/20 text-blue-400" : ticket.category === "orders" ? "bg-purple-500/20 text-purple-400" : ticket.category === "wallet" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                      {ticket.category === "wallet" ? "المحفظة" : ticket.category === "orders" ? "الطلبات" : ticket.category === "services" ? "الخدمات" : "عام"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${ticket.priority === "urgent" ? "bg-red-500/20 text-red-400" : ticket.priority === "high" ? "bg-amber-500/20 text-amber-400" : ticket.priority === "normal" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                      {ticket.priority === "urgent" ? "عاجل" : ticket.priority === "high" ? "عالية" : ticket.priority === "normal" ? "عادية" : "منخفضة"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${ticket.status === "open" ? "bg-amber-500/20 text-amber-400" : ticket.status === "in_progress" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                      {ticket.status === "open" ? "مفتوحة" : ticket.status === "in_progress" ? "قيد المتابعة" : "مغلقة"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
                      {ticket.messages} رسائل
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-400">{ticket.lastReply}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/sites/${(await import("next/navigation")).useParams().then(p => (await p).slug)}/tickets/${ticket.id}`} className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors">
                      <MessageSquare size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TicketsPage;