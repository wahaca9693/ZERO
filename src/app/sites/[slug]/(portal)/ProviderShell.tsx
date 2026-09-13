"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  slug: string;
  siteName: string;
  logoUrl?: string;
  primary: string;
  secondary: string;
  primaryLight: string;
  expired: boolean;
  children: React.ReactNode;
};

export default function ProviderShell({ slug, siteName, logoUrl, primary, secondary, primaryLight, expired, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Apply theme CSS vars on the portal root
  useEffect(() => {
    setMounted(true);
    const proceed = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/auth/me`, { cache: "no-store" });
        const data = await res.json();
        if (!data.authenticated && !pathname.startsWith(`/sites/${encodeURIComponent(slug)}/login`)) {
          router.replace(`/sites/${encodeURIComponent(slug)}/login`);
        }
      } catch {}
    };
    void proceed();
  }, [slug, pathname, router]);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#0b0b09] text-white font-sans"
      style={
        {
          "--color-primary": primary,
          "--color-primary-light": primaryLight,
          "--color-gold": secondary,
          "--color-bg": "#0b0b09",
          "--color-card": "#111111",
          "--color-surface": "#1a1a1a",
          "--color-border": "#27272a",
        } as React.CSSProperties
      }
    >
      {/* Top branding bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0b0b09]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-9 w-auto object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-gold)] text-sm font-black text-[#111]">
                {siteName.charAt(0)}
              </div>
            )}
            <span className="text-lg font-black text-white">{siteName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
            {expired && <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-400">منتهي الاشتراك</span>}
            <button
              onClick={async () => {
                await fetch(`/api/sites/${encodeURIComponent(slug)}/auth/logout`, { method: "POST" });
                router.push(`/sites/${encodeURIComponent(slug)}/login`);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-white hover:bg-white/10"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#0b0b09]/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 py-2">
          {[
            { label: "الرئيسية", href: `/sites/${encodeURIComponent(slug)}/dashboard`, icon: "🏠" },
            { label: "الخدمات", href: `/sites/${encodeURIComponent(slug)}/services`, icon: "🛒" },
            { label: "طلباتي", href: `/sites/${encodeURIComponent(slug)}/orders`, icon: "📦" },
            { label: "المحفظة", href: `/sites/${encodeURIComponent(slug)}/wallet`, icon: "💰" },
          ].map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold transition ${
                  active ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]" : "text-zinc-400"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4">{children}</main>
    </div>
  );
}