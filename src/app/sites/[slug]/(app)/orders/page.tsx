import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Search, Filter, Package, Clock, CheckCircle2, AlertCircle, Truck, Package as PackageIcon, MoreVertical } from "lucide-react";
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

export default async function OrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSiteData(slug);
  
  if (!data) notFound();
  
  const { site, expired } = data;
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };
  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const siteName = theme.siteName || site.displayName;

  const orders = [
    { id: "ORD-001", service: "Instagram Followers", category: "instagram", quantity: 1000, price: 12.50, status: "completed", progress: 100, date: "2024-01-15 14:30", link: "https://instagram.com/user" },
    { id: "ORD-002", service: "YouTube Views", category: "youtube", quantity: 5000, price: 25.00, status: "processing", progress: 65, date: "2024-01-14 10:15", link: "https://youtube.com/watch?v=..." },
    { id: "ORD-003", service: "TikTok Likes", category: "tiktok", quantity: 500, price: 5.00, status: "pending", progress: 0, date: "2024-01-14 09:30", link: "https://tiktok.com/@user" },
    { id: "ORD-004", service: "Telegram Members", category: "telegram", quantity: 200, price: 8.00, status: "completed", progress: 100, date: "2024-01-13 16:45", link: "https://t.me/channel" },
    { id: "ORD-005", service: "YouTube Subscribers", category: "youtube", quantity: 1000, price: 15.00, status: "processing", progress: 40, date: "2024-01-12 11:20", link: "https://youtube.com/channel" },
    { id: "ORD-006", service: "Instagram Views", category: "instagram", quantity: 2000, price: 6.00, status: "completed", progress: 100, date: "2024-01-11 14:20", link: "https://instagram.com/reel/..." },
  ];

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredOrders = orders.filter(order => {
    if (filter !== "all" && order.status !== filter) return false;
    if (search && !order.id.toLowerCase().includes(search.toLowerCase()) && !order.service.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6" style={{ "--site-primary": "var(--site-primary)", "--site-secondary": "var(--site-secondary)" } as React.CSSProperties}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">طلباتي</h1>
          <p className="text-zinc-400">متابعة جميع طلباتك وإدارة الخدمات</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white outline-none" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">الكل</option>
            <option value="completed">مكتملة</option>
            <option value="processing">قيد المعالجة</option>
            <option value="pending">معلقة</option>
            <option value="cancelled">ملغية</option>
          </select>
          <input type="text" placeholder="بحث..." className="w-64 pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--site-primary)]" placeholder="Search..." onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الطلب</th>
              <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الخدمة</th>
              <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الكمية</th>
              <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">المبلغ</th>
              <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الحالة</th>
              <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">التقدم</th>
              <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">التاريخ</th>
              <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-white/10 hover:bg-white/5">
                <td className="px-6 py-4 text-right">
                  <div className="font-bold text-white">{order.id}</div>
                  <div className="text-xs text-zinc-500">{order.category}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="font-bold text-white truncate max-w-xs">{order.service}</div>
                </td>
                <td className="px-6 py-4 text-right text-zinc-300">{order.quantity.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-bold text-white">{order.price.toFixed(2)} $</td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${order.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : order.status === "processing" ? "bg-blue-500/20 text-blue-400" : order.status === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                    {order.status === "completed" ? "مكتمل" : order.status === "processing" ? "قيد المعالجة" : order.status === "pending" ? "معلق" : "ملغي"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="w-32">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--site-primary)] transition-all duration-500" style={{ width: `${order.progress}%` }} />
                    </div>
                    <span className="text-xs text-zinc-400">{order.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-zinc-400">{order.date}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a href={order.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors" title="رابط الخدمة">
                      <ExternalLink size={16} />
                    </a>
                    <button className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors" title="تفاصيل">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OrdersPage;