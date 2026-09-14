"use client";

import { useEffect, useState } from "react";
import { Wallet, Copy, Check, ArrowUpRight, Loader2 } from "lucide-react";

type Props = { slug: string; siteName: string };

type PaymentMethod = { name: string; instructions: string; enabled: boolean };

type Transaction = { id: number; type: string; amount: number; status: string; description: string; created_at: string };

type WalletData = {
  balance: number;
  username: string;
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
};

export default function PortalWallet({ slug, siteName }: Props) {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/wallet`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "تعذر تحميل المحفظة");
        setData({
          balance: Number(json.balance || 0),
          username: String(json.username || ""),
          transactions: Array.isArray(json.transactions) ? json.transactions : [],
          paymentMethods: Array.isArray(json.paymentMethods) ? json.paymentMethods : [],
        });
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [slug]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-400">
        <Loader2 className="ml-2 animate-spin" size={20} /> جارٍ تحميل المحفظة...
      </div>
    );
  }

  const balance = Number(data?.balance || 0);
  const methods = data?.paymentMethods || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">المحفظة</h1>
        <p className="mt-1 text-sm text-zinc-400">رصيدك داخل {siteName}</p>
      </div>

      {/* Balance card */}
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6">
        <div className="flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
            <Wallet size={26} />
          </span>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm font-bold text-zinc-400">الرصيد الحالي</p>
          <p className="mt-2 text-5xl font-black text-white">${balance.toFixed(2)}</p>
          <span className="text-lg font-bold text-zinc-500">USD</span>
        </div>
      </div>

      {/* Deposit methods */}
      {methods.length > 0 && (
        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-black text-white">
            <ArrowUpRight size={18} className="text-[var(--color-primary)]" /> طرق الشحن المتاحة
          </h2>
          <div className="space-y-3">
            {methods.map((method, index) => (
              <div key={`${method.name}-${index}`} className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-4">
                <p className="text-sm font-black text-white">{method.name}</p>
                {method.instructions && (
                  <p className="mt-2 text-xs leading-6 text-zinc-400">{method.instructions}</p>
                )}
                {method.instructions && (
                  <button
                    onClick={() => copy(method.instructions, `${method.name}-${index}`)}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10"
                  >
                    {copied === `${method.name}-${index}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied === `${method.name}-${index}` ? "تم النسخ" : "نسخ التعليمات"}
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-center text-xs leading-6 text-amber-300">
            بعد إتمام عملية الشحن، تواصل مع إدارة {siteName} لتأكيد إيداع رصيدك.
          </p>
        </div>
      )}

      {/* Transactions */}
      {data && data.transactions.length > 0 && (
        <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
          <h2 className="mb-3 text-base font-black text-white">سجل المعاملات</h2>
          <div className="space-y-2">
            {data.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-white">{tx.description || tx.type}</p>
                  <p className="text-xs text-zinc-500">{new Date(tx.created_at).toLocaleString("ar-IQ")}</p>
                </div>
                <span className={`text-sm font-black ${Number(tx.amount) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {Number(tx.amount) >= 0 ? "+" : ""}{Number(tx.amount).toFixed(2)} USD
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}