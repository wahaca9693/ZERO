import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DollarSign, CreditCard, Smartphone, Loader2, CheckCircle2, AlertCircle, ArrowRight, ExternalLink } from "lucide-react";
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

export default async function DepositPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSiteData(slug);
  
  if (!data) notFound();
  
  const { site, expired } = data;
  const theme = site.theme as { primaryColor?: string; secondaryColor?: string; siteName?: string; logoUrl?: string };
  const primary = theme.primaryColor || "#f97316";
  const secondary = theme.secondaryColor || "#fbbf24";
  const siteName = theme.siteName || site.displayName;

  const balance = 1250.75;
  const [activeMethod, setActiveMethod] = useState("asiacell");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const methods = [
    { 
      id: "asiacell", 
      name: "آسياسيل", 
      icon: Smartphone, 
      color: "bg-green-500/20 text-green-400",
      description: "شحن فوري عبر رقم آسياسيل",
      instructions: "أدخل رقم آسياسيل وسيتم إرسال رمز التحقق",
      minAmount: 1000,
      fee: 0,
    },
    { 
      id: "crypto", 
      name: "العملات الرقمية", 
      icon: DollarSign, 
      color: "bg-orange-500/20 text-orange-400",
      description: "USDT, BTC, ETH وأكثر",
      instructions: "اختر العملة وأرسل المبلغ للمحفظة المعروضة",
      minAmount: 10,
      fee: 0,
    },
    { 
      id: "card", 
      name: "بطاقة مصرفية", 
      icon: CreditCard, 
      color: "bg-blue-500/20 text-blue-400",
      description: "Visa, Mastercard, مدى",
      instructions: "أدخل بيانات البطاقة للشحن الفوري",
      minAmount: 5,
      fee: 2.5,
    },
  ];

  const currentMethod = methods.find(m => m.id === activeMethod) || methods[0];

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) < currentMethod.minAmount) {
      setMessage({ text: `الحد الأدنى للإيداع ${currentMethod.minAmount} ${currentMethod.id === "crypto" ? "$" : "د.ع"}`, error: true });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/sites/${slug}/wallet/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: activeMethod, amount: parseFloat(amount) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "فشل الإيداع");
      setMessage({ text: data.message || "تم الإيداع بنجاح" });
      setAmount("");
      // Refresh balance would go here
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "حدث خطأ", error: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" style={{ "--site-primary": "var(--site-primary)", "--site-secondary": "var(--site-secondary)" } as React.CSSProperties}>
      {/* Balance Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--site-primary)]/20 to-[var(--site-secondary)]/20 border border-[var(--site-primary)]/30 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">شحن الرصيد</h1>
            <p className="mt-1 text-zinc-400">رصيدك الحالي: <span className="font-black text-emerald-400">1,250.75 $</span></p>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-xl font-black text-white">اختر طريقة الدفع</h2>
        <div className="flex flex-wrap gap-4">
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => setActiveMethod(method.id)}
              className={`flex flex-1 min-w-[180px] max-w-[250px] items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                activeMethod === method.id
                  ? "border-[var(--site-primary)] bg-[var(--site-primary)]/10"
                  : "border-white/10 bg-white/5 hover:border-[var(--site-primary)]/50 hover:bg-white/5"
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${method.color}`}>
                <method.icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white">{method.name}</p>
                <p className="text-xs text-zinc-500">{method.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Deposit Form */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-xl font-black text-white">تفاصيل الإيداع</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">المبلغ</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`الحد الأدنى: ${currentMethod.minAmount}`}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[var(--site-primary)]"
                min={currentMethod.minAmount}
                step={currentMethod.id === "crypto" ? "0.01" : "1"}
              />
              <span className="px-4 py-3 text-zinc-400">
                {currentMethod.id === "crypto" ? "USDT" : "د.ع"}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">الحد الأدنى: {currentMethod.minAmount} {currentMethod.id === "crypto" ? "$" : "د.ع"}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 font-bold text-white">التعليمات</h3>
            <p className="text-sm text-zinc-400 mb-3">{currentMethod.instructions}</p>
            <div className="rounded-lg bg-white/5 p-3 text-sm">
              <p className="font-bold text-white mb-1">مثال:</p>
              <p className="text-zinc-400">
                {currentMethod.id === "asiacell" ? "أدخل رقم آسياسيل: 07XXXXXXXXX" : 
                 currentMethod.id === "crypto" ? "اختر USDT TRC20، أرسل 50 USDT للمحفظة المعروضة" :
                 "أدخل رقم البطاقة: 4XXX XXXX XXXX XXXX"}
              </p>
            </div>
          </div>

          {message && (
            <div className={`rounded-xl p-3 text-sm font-bold ${message.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleDeposit}
            disabled={loading || !amount || parseFloat(amount) < currentMethod.minAmount}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--site-primary)] py-4 font-black text-black hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={18} />}
            {loading ? "جاري المعالجة..." : `إيداع ${amount} ${currentMethod.id === "crypto" ? "USDT" : "د.ع"}`}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-xl font-black text-white">آخر عمليات الإيداع</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">المعاملة</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الطريقة</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">المبلغ</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">الحالة</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-zinc-400">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: "DEP-001", method: "آسياسيل", amount: 150, status: "completed", date: "2024-01-15 14:30" },
                { id: "DEP-002", method: "كريبتو (USDT)", amount: 500, status: "completed", date: "2024-01-14 16:45" },
                { id: "DEP-003", method: "آسياسيل", amount: 100, status: "pending", date: "2024-01-15 16:00" },
              ].map((dep) => (
                <tr key={dep.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-6 py-4 text-right font-bold text-white">{dep.id}</td>
                  <td className="px-6 py-4 text-right text-zinc-400">{dep.method}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-400">+{dep.amount} {dep.method === "كريبتو (USDT)" ? "USDT" : "د.ع"}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${dep.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                      {dep.status === "completed" ? "مكتمل" : "معلق"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-400">{dep.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DepositPage;