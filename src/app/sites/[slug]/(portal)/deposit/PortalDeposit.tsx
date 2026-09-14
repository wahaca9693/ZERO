"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Loader2, Wallet, Landmark, Smartphone, ArrowDownToLine } from "lucide-react";

type Props = { slug: string; siteName: string };

type PaymentMethod = { name: string; instructions: string; enabled: boolean };

export default function PortalDeposit({ slug, siteName }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/deposit`, { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.paymentMethods)) setMethods(data.paymentMethods);
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

  const methodIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("usdt") || lower.includes("crypto") || lower.includes("coin") || lower.includes("btc") || lower.includes("trc") || lower.includes("bep")) {
      return <Landmark size={22} />;
    }
    if (lower.includes("asia") || lower.includes("zain") || lower.includes("phone") || lower.includes("mobile")) {
      return <Smartphone size={22} />;
    }
    return <Wallet size={22} />;
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-400">
        <Loader2 className="ml-2 animate-spin" size={20} /> جارٍ تحميل طرق الشحن...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">شحن الرصيد</h1>
        <p className="mt-1 text-sm text-zinc-400">أضف رصيدًا إلى حسابك داخل {siteName}</p>
      </div>

      <div className="rounded-3xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[#2e210b] to-[#1e1506] p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-gold)] text-[#111]">
          <ArrowDownToLine size={26} />
        </div>
        <h2 className="text-lg font-black text-white">اختر طريقة الشحن</h2>
        <p className="mt-1 text-sm text-zinc-400">اتبع تعليمات الطريقة المختارة لإتمام الإيداع</p>
      </div>

      {methods.length === 0 && (
        <p className="rounded-3xl border border-white/5 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
          لا توجد طرق شحن مفعّلة حاليًا. تواصل مع إدارة {siteName} لشحن رصيدك.
        </p>
      )}

      {methods.map((method, index) => (
        <div key={`${method.name}-${index}`} className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
              {methodIcon(method.name)}
            </span>
            <div className="flex-1">
              <p className="font-black text-white">{method.name}</p>
              <p className="text-xs text-zinc-500">{index === 0 ? "الطريقة الرئيسية" : `طريقة ${index + 1}`}</p>
            </div>
          </div>
          {method.instructions && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#1a1a1a] p-4">
              <p className="whitespace-pre-line text-sm leading-7 text-zinc-300">{method.instructions}</p>
              <button
                onClick={() => copy(method.instructions, `${method.name}-${index}`)}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10"
              >
                {copied === `${method.name}-${index}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied === `${method.name}-${index}` ? "تم النسخ" : "نسخ التعليمات"}
              </button>
            </div>
          )}
        </div>
      ))}

      <p className="rounded-2xl bg-amber-500/10 p-4 text-center text-xs leading-6 text-amber-300">
        بعد إتمام عملية الشحن، أرسل إثبات الدفع إلى إدارة {siteName} لتأكيد إيداع رصيدك خلال أقصر وقت.
      </p>
    </div>
  );
}