"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "../../../components/Header";
import Sidebar from "../../../components/Sidebar";
import BottomNav from "../../../components/BottomNav";

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

type ResellerUser = {
  id: number;
  username: string;
  balance: number;
  role: string;
};

export default function ProviderShell({ slug, siteName, logoUrl, primary, secondary, primaryLight, expired, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<ResellerUser | null>(null);
  const [checked, setChecked] = useState(false);

  const basePath = `/sites/${encodeURIComponent(slug)}`;

  useEffect(() => {
    const proceed = async () => {
      try {
        const res = await fetch(`/api/sites/${encodeURIComponent(slug)}/auth/me`, { cache: "no-store" });
        const data = await res.json();
        if (data.authenticated && data.user) setUser(data.user);
        else if (!pathname.startsWith(`${basePath}/login`)) router.replace(`${basePath}/login`);
      } catch {}
      setChecked(true);
    };
    void proceed();
  }, [slug, pathname, router, basePath]);

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
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        user={user ? { username: user.username, balance: user.balance, role: user.role } : null}
        basePath={basePath}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user ? { username: user.username, balance: user.balance, role: user.role } : null}
        basePath={basePath}
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4">
        {checked ? children : (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          </div>
        )}
      </main>

      <BottomNav basePath={basePath} />
    </div>
  );
}
