import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DollarSign, CreditCard, ArrowRight, ChevronDown, Loader2, AlertCircle, CheckCircle2, MinusCircle, PlusCircle } from "lucide-react";
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

export default async function WalletPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSiteData(slug);
  
  if (!data) notFound();
  
  const { site, expired } = data;
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };
  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const siteName = theme.siteName || site.displayName;

  const balance = 1250.75;
  const pendingBalance = 45.50;
  const totalDeposited = 3450.00;
  const totalWithdrawn = 1200.00;

  const transactions = [
    { id: "TXN-001", type: "deposit", method: "آسياسيل", amount: 150.00, status: "completed", date: "2024-01-15 14:30" },
    { id: "TXN-002", type: "withdraw", method: "تحويل بنكي", amount: 200.00, status: "completed", date: "2024-01-14 10:15" },
    { id: "TXN-003", type: "order", method: "طلب خدمة", amount: -45.50, status: "completed", date: "2024-01-14 09:30" },
    { id: "TXN-004", type: "deposit", method: "كريبتو (USDT)", amount: 500.00, status: "completed", date: "2024-01-13 16:45" },
    { id: "TXN-005", type: "deposit", method: "آسياسيل", amount: 100.00, status: "pending", date: "2024-01-15 16:00" },
    { id: "TXN-006", type: "withdraw", method: "باي بال", amount: 50.00, status: "cancelled", date: "2024-01-12 11:20" },
  ];

  const [activeTab, setActiveTab] = useState("overview");
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  return (
    <div className="space-y-6" style={{ "--site-primary": "var(--site-primary)", "--site-secondary": "var(--site-secondary)" } as React.CSSProperties}>
      {/* Balance Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <BalanceCard title="الرصيد المتاح" value={`${balance.toFixed(2)} $`} icon="💰" color="emerald" />
        <BalanceCard title="الرصيد المعلق" value={`${pendingBalance.toFixed(2)} $`} icon="⏳" color="amber" />
        <BalanceCard title="إجمالي الإيداعات" value={`${totalDeposited.toFixed(2)} $`} icon="⬇️" color="blue" />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={() => setShowDepositModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--site-primary)] px-5 py-3 font-black text-black hover:brightness-110"
        >
          <span className="text-2xl">⬇️</span>
          إيداع رصيد
        </button>
        <button 
          onClick={() => setShowWithdrawModal(true)}
          disabled={balance < 10}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-black text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-2xl">⬆️</span>
          سحب رصيد
        </button>
        <Link 
          href={`/sites/${(await import("next/navigation")).useParams().then(p => (await p).slug)}/deposit`}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-black text-white hover:bg-white/10"
        >
          <span className="text-2xl">💳</span>
          طرق الإيداع
        </Link>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-xl font-black text-white">سجل المعاملات</h2>
          <select 
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white outline-none"
            defaultValue="all"
          >
            <option value="all">الكل</option>
            <option value="deposit">إيداعات</option>
            <option value="withdraw">سحوبات</option>
            <option value="order">طلبات</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">المعاملة</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">النوع</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الطريقة</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">المبلغ</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الحالة</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <TransactionRow key={txn.id} txn={txn} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BalanceCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  const colors = {
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-400/30",
    amber: "bg-amber-500/20 text-amber-400 border-amber-400/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-400/30",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-zinc-400">{title}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${colors[color as keyof typeof colors] || colors.emerald} text-3xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ txn }: { txn: any }) {
  const typeLabels = { deposit: "إيداع", withdraw: "سحب", order: "طلب خدمة" };
  const typeColors = { deposit: "bg-emerald-500/20 text-emerald-400", withdraw: "bg-blue-500/20 text-blue-400", order: "bg-amber-500/20 text-amber-400" };
  const statusColors = { completed: "bg-emerald-500/20 text-emerald-400", pending: "bg-amber-500/20 text-amber-400", cancelled: "bg-red-500/20 text-red-400" };
  const statusLabels = { completed: "مكتمل", pending: "معلق", cancelled: "ملغي" };
  
  return (
    <tr className="border-b border-white/10 hover:bg-white/5">
      <td className="px-6 py-4 text-right">
        <div className="font-bold text-white">{txn.id}</div>
        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${typeColors[txn.type as keyof typeof typeColors] || typeColors.deposit}`}>
          {typeLabels[txn.type as keyof typeof typeLabels] || txn.type}
        </div>
      </td>
      <td className="px-6 py-4 text-right text-zinc-400">{txn.method}</td>
      <td className="px-6 py-4 text-right">
        <span className={`font-bold ${txn.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {txn.amount > 0 ? "+" : ""}{txn.amount.toFixed(2)} $
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${statusColors[txn.status as keyof typeof statusColors] || statusColors.completed}`}>
          {statusLabels[txn.status as keyof typeof statusLabels] || txn.status}
        </span>
      </td>
      <td className="px-6 py-4 text-right text-zinc-400">{txn.date}</td>
    </tr>
  );
}

export default WalletPage;