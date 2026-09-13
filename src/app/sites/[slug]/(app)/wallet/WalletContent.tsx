"use client";

import { useState } from "react";
import Link from "next/link";
import { DollarSign, CreditCard, Smartphone, Loader2, CheckCircle2, AlertCircle, ArrowRight, ExternalLink } from "lucide-react";

type Props = {
  slug: string;
  siteName: string;
  primary: string;
  secondary: string;
  expired: boolean;
};

export default function WalletContent({ slug, siteName, primary, secondary, expired }: Props) {
  const [activeMethod, setActiveMethod] = useState("asiacell");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const methods = [
    { id: "asiacell", name: "آسياسيل", icon: "📱", desc: "تحويل مباشر عبر الرقم" },
    { id: "crypto", name: "عملات رقمية", icon: "🪙", desc: "USDT (TRC20)" },
    { id: "card", name: "بطاقة ائتمانية", icon: "💳", desc: "Visa / Mastercard" },
  ];

  const currentMethod = methods.find(m => m.id === activeMethod) || methods[0];

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage({ text: "يرجى إدخال مبلغ صحيح", error: true });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/sites/${slug}/api/deposit`, {
        method: "POST",
        body: JSON.stringify({ amount, method: activeMethod }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "تم إرسال طلب الإيداع بنجاح!", error: false });
        setAmount("");
      } else {
        setMessage({ text: data.error || "حدث خطأ أثناء الإيداع", error: true });
      }
    } catch {
      setMessage({ text: "فشل الاتصال بالخادم", error: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-white/5 bg-white/[0.03] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--site-primary)]/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-zinc-400 font-bold">الرصيد الحالي</p>
              <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-bold text-zinc-500">تحديث تلقائي</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-6xl font-black tracking-tighter">$0.00</h2>
              <span className="text-xl font-bold text-zinc-500">USD</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "إيداعات", value: "$0.00", icon: "⬇️" },
                { label: "سحوبات", value: "$0.00", icon: "⬆️" },
                { label: "منفق", value: "$0.00", icon: "📉" },
                { label: "أرباح", value: "$0.00", icon: "📈" },
              ].map((stat, i) => (
                <div key={i} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                    <span>{stat.icon}</span> {stat.label}
                  </div>
                  <p className="text-lg font-black">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 space-y-6">
          <h3 className="text-xl font-black">شحن سريع</h3>
          <div className="space-y-3">
            {methods.map((m) => (
              <button 
                key={m.id} 
                onClick={() => setActiveMethod(m.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  activeMethod === m.id ? "border-[var(--site-primary)] bg-[var(--site-primary)]/10 text-white" : "border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{m.icon}</span>
                  <span className="font-bold">{m.name}</span>
                </div>
                {activeMethod === m.id && <CheckCircle2 size={18} className="text-[var(--site-primary)]" />}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500">المبلغ المطلوب شحنه</label>
            <div className="relative">
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[var(--site-primary)] font-black text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">USD</span>
            </div>
          </div>

          <button 
            onClick={handleDeposit}
            disabled={loading}
            className="w-full rounded-2xl bg-[var(--site-primary)] py-4 font-black text-black hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "تأكيد عملية الشحن"}
          </button>

          {message && (
            <div className={`p-4 rounded-2xl text-sm font-bold ${message.error ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}