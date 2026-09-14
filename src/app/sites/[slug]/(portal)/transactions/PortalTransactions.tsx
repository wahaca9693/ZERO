"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";

type Props = { slug: string; siteName: string };

type Transaction = { id: number; type: string; amount: number; status: string; description: string; method: string; created_at: string };

export default function PortalTransactions({ slug, siteName }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/transactions`, { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [slug]);

  const typeLabels: Record<string, string> = {
    order: "طلب خدمة",
    deposit: "إيداع",
    refund: "استرجاع",
    adjustment: "تعديل يدوي",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">سجل المعاملات</h1>
        <p className="mt-1 text-sm text-zinc-400">حركة رصيدك داخل {siteName}</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03]">
        {loading && (
          <div className="flex min-h-[30vh] items-center justify-center text-zinc-400">
            <Loader2 className="ml-2 animate-spin" size={20} /> جارٍ التحميل...
          </div>
        )}
        {!loading && transactions.length === 0 && (
          <div className="p-10 text-center">
            <RefreshCw className="mx-auto mb-3 text-zinc-600" size={32} />
            <p className="font-bold text-zinc-400">لا توجد معاملات بعد.</p>
          </div>
        )}
        {transactions.map((tx) => {
          const isCredit = Number(tx.amount) >= 0;
          return (
            <div key={tx.id} className="flex items-center justify-between border-b border-white/5 px-5 py-4 last:border-0">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isCredit ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{tx.description || typeLabels[tx.type] || tx.type}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{new Date(tx.created_at).toLocaleString("ar-IQ")}</p>
                </div>
              </div>
              <span className={`text-sm font-black ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                {isCredit ? "+" : ""}{Number(tx.amount).toFixed(2)} USD
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}