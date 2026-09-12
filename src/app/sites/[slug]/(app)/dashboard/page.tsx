import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  Wallet, 
  ShoppingBag, 
  Ticket, 
  Package, 
  TrendingUp, 
  Users, 
  CreditCard,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Package as PackageIcon,
  Ticket as TicketIcon,
  Wallet as WalletIcon
} from "lucide-react";

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

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSiteData(slug);
  
  if (!data) notFound();
  
  const { site, expired } = data;
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };
  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const siteName = theme.siteName || site.displayName;

  // Mock data - replace with real API calls
  const stats = {
    balance: 1250.75,
    totalOrders: 142,
    pendingOrders: 8,
    completedOrders: 124,
    activeTickets: 2,
    totalSpent: 3450.00,
  };

  const recentOrders = [
    { id: "ORD-001", service: "Instagram Followers", quantity: 1000, status: "completed", amount: 12.50, date: "2024-01-15" },
    { id: "ORD-002", service: "YouTube Views", quantity: 5000, status: "processing", amount: 25.00, date: "2024-01-14" },
    { id: "ORD-003", service: "TikTok Likes", quantity: 500, status: "pending", amount: 5.00, date: "2024-01-14" },
    { id: "ORD-004", service: "Telegram Members", quantity: 200, status: "completed", amount: 8.00, date: "2024-01-13" },
  ];

  const recentTickets = [
    { id: "TKT-001", subject: "طلب لم يكتمل", status: "open", priority: "high", date: "2024-01-15" },
    { id: "TKT-002", subject: "استفسار عن الأسعار", status: "closed", priority: "low", date: "2024-01-10" },
  ];

  return (
    <div className="space-y-6" style={{ "--site-primary": "var(--site-primary)", "--site-secondary": "var(--site-secondary)" } as React.CSSProperties}>
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--site-primary)]/20 to-[var(--site-secondary)]/20 border border-[var(--site-primary)]/30 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">مرحباً بك في لوحة التحكم</h1>
            <p className="mt-1 text-zinc-400">إدارة شاملة لخدماتك، محفظتك، وطلباتك</p>
          </div>
          <Link 
            href={`/sites/${(await import("next/navigation")).useParams().then(p => (await p).slug)}/deposit`}
            className="flex items-center gap-2 rounded-xl bg-[var(--site-primary)] px-5 py-3 font-black text-black hover:brightness-110 transition-colors"
          >
            <DollarSign size={18} /> شحن الرصيد
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="الرصيد الحالي" 
          value={`${stats.balance.toFixed(2)} $`} 
          icon={<WalletIcon className="h-6 w-6" />} 
          color="emerald"
          trend="+12.5%"
          trendUp={true}
        />
        <StatCard 
          title="إجمالي الطلبات" 
          value={stats.totalOrders.toString()} 
          icon={<ShoppingBag className="h-6 w-6" />} 
          color="blue"
          trend="+8 هذا الشهر"
          trendUp={true}
        />
        <StatCard 
          title="الطلبات المعلقة" 
          value={stats.pendingOrders.toString()} 
          icon={<Clock className="h-6 w-6" />} 
          color="amber"
          trend="بانتظار المعالجة"
          trendUp={false}
        />
        <StatCard 
          title="التذاكر المفتوحة" 
          value={stats.activeTickets.toString()} 
          icon={<TicketIcon className="h-6 w-6" />} 
          color="red"
          trend="تحتاج متابعة"
          trendUp={false}
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-xl font-black text-white">إجراءات سريعة</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href={`/sites/${(await import("next/navigation")).useParams().then(p => (await p).slug)}/services`} icon={<PackageIcon className="h-6 w-6" />} title="تصفح الخدمات" desc="طلب خدمات جديدة" />
          <QuickAction href={`/sites/${(await import("next/navigation")).useParams().then(p => (await p).slug)}/deposit`} icon={<DollarSign className="h-6 w-6" />} title="شحن الرصيد" desc="إضافة رصيد جديد" />
          <QuickAction href={`/sites/${(await import("next/navigation")).useParams().then(p => (await p).slug)}/orders`} icon={<ShoppingBag className="h-6 w-6" />} title="طلباتي" desc="متابعة طلباتك" />
          <QuickAction href={`/sites/${(await import("next/navigation")).useParams().then(p => (await p).slug)}/tickets`} icon={<TicketIcon className="h-6 w-6" />} title="الدعم الفني" desc="فتح تذكرة جديدة" />
        </div>
      </div>

      {/* Recent Activity - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-white">أحدث الطلبات</h2>
            <Link href={`/sites/${(await import("next/navigation")).useParams().then(p => (await p).slug)}/orders`} className="text-sm font-bold text-[var(--site-primary)] hover:underline">
              عرض الكل <ArrowRight size={14} className="inline ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        </section>

        {/* Recent Tickets */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-white">التذاكر الأخيرة</h2>
            <Link href={`/sites/${(await import("next/navigation")).useParams().then(p => (await p).slug)}/tickets`} className="text-sm font-bold text-[var(--site-primary)] hover:underline">
              عرض الكل <ArrowRight size={14} className="inline ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentTickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </section>
      </div>

      {/* Platform Info */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-xl font-black text-white">معلومات المنصة</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard title="اسم المنصة" value={(await import("next/navigation")).useParams().then(p => (await p).slug)} icon={<Package className="h-5 w-5" />} />
          <InfoCard title="حالة الاشتراك" value="نشط" icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} />
          <InfoCard title="إجمالي الإنفاق" value={`${stats.totalSpent.toFixed(2)} $`} icon={<DollarSign className="h-5 w-5" />} />
          <InfoCard title="إجمالي الخدمات" value={stats.totalOrders.toString()} icon={<PackageIcon className="h-5 w-5" />} />
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color, trend, trendUp }: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  color: string; 
  trend: string; 
  trendUp: boolean; 
}) {
  const colors = {
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-400/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-400/30",
    amber: "bg-amber-500/20 text-amber-400 border-amber-400/30",
    red: "bg-red-500/20 text-red-400 border-red-400/30",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-zinc-400">{title}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color as keyof typeof colors] || colors.emerald}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs">
        {trendUp ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-amber-400" />}
        <span className={trendUp ? "text-emerald-400" : "text-amber-400"}>{trend}</span>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <a href={href} className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center hover:border-[var(--site-primary)]/50 hover:bg-white/10 transition-all">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--site-primary)]/15 text-[var(--site-primary)]">
        {icon}
      </div>
      <h3 className="font-black text-white">{title}</h3>
      <p className="text-xs text-zinc-500">{desc}</p>
    </a>
  );
}

function OrderRow({ order }: { order: { id: string; service: string; quantity: number; status: string; amount: number; date: string } }) {
  const statusColors = {
    completed: "bg-emerald-500/20 text-emerald-400",
    processing: "bg-blue-500/20 text-blue-400",
    pending: "bg-amber-500/20 text-amber-400",
    cancelled: "bg-red-500/20 text-red-400",
  };
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white truncate">{order.service}</p>
        <p className="text-xs text-zinc-500">#{order.id} • {order.quantity} وحدة • {order.date}</p>
      </div>
      <div className="text-right">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${({ completed: "bg-emerald-500/20 text-emerald-400", processing: "bg-blue-500/20 text-blue-400", pending: "bg-amber-500/20 text-amber-400", cancelled: "bg-red-500/20 text-red-400" } as Record<string, string>)[order.status]}`}>
          {order.status === "completed" ? "مكتمل" : order.status === "processing" ? "قيد المعالجة" : order.status === "pending" ? "معلق" : "ملغي"}
        </span>
        <p className="mt-1 font-bold text-white">{order.amount.toFixed(2)} $</p>
      </div>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: { id: string; subject: string; status: string; priority: string; date: string } }) {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white truncate">{ticket.subject}</p>
          <p className="text-xs text-zinc-500">#{ticket.id} • {ticket.date}</p>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${ticket.status === "open" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
          {ticket.status === "open" ? "مفتوحة" : "مغلقة"}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${ticket.priority === "high" ? "bg-red-500/20 text-red-400" : "bg-zinc-500/20 text-zinc-400"}`}>
          {ticket.priority === "high" ? "عالية" : "عادية"}
        </span>
      </div>
    </div>
  );
}

function InfoCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        {icon}
        <span>{title}</span>
      </div>
      <p className="mt-1 font-bold text-white truncate">{value}</p>
    </div>
  );
}

export default DashboardPage;