"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Package, Clock, CheckCircle2, AlertCircle, Package as PackageIcon } from "lucide-react";

type Props = {
  slug: string;
  siteName: string;
  primary: string;
  secondary: string;
  expired: boolean;
};

export default function ServicesPage({ slug, siteName, primary, secondary, expired }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = [
    { id: "all", name: "الكل", icon: Package, count: services.reduce((a, s) => a + s.count, 0) },
    { id: "instagram", name: "Instagram", icon: () => <span>📷</span>, count: 45 },
    { id: "youtube", name: "YouTube", icon: () => <span>▶️</span>, count: 32 },
    { id: "tiktok", name: "TikTok", icon: () => <span>🎵</span>, count: 28 },
    { id: "twitter", name: "Twitter/X", icon: () => <span>🐦</span>, count: 22 },
    { id: "telegram", name: "Telegram", icon: () => <span>✈️</span>, count: 18 },
    { id: "facebook", name: "Facebook", icon: () => <span>📘</span>, count: 15 },
    { id: "snapchat", name: "Snapchat", icon: () => <span>👻</span>, count: 12 },
    { id: "spotify", name: "Spotify", icon: () => <span>🎧</span>, count: 10 },
  ];

  const services = [
    { id: 1, name: "متابعين انستقرام حقيقيين", category: "instagram", min: 100, max: 50000, rate: 0.85, avgTime: "1-6 ساعة", description: "متابعين حقيقيين ونشطين مع ضمان عدم النقص" },
    { id: 2, name: "لايكات انستقرام", category: "instagram", min: 50, max: 10000, rate: 0.45, avgTime: "فوري - 30 دقيقة", description: "لايكات من حسابات حقيقية" },
    { id: 3, name: "مشاهدات يوتيوب", category: "youtube", min: 1000, max: 1000000, rate: 0.35, avgTime: "1-12 ساعة", description: "مشاهدات حقيقية مع احتفاظ عالي" },
    { id: 4, name: "مشتركين يوتيوب", category: "youtube", min: 100, max: 10000, rate: 1.20, avgTime: "6-24 ساعة", description: "مشتركين حقيقيين مع تفاعل" },
    { id: 5, name: "مشاهدات تيك توك", category: "tiktok", min: 500, max: 500000, rate: 0.25, avgTime: "فوري - ساعة", description: "مشاهدات حقيقية من حسابات نشطة" },
    { id: 6, name: "متابعين تيك توك", category: "tiktok", min: 100, max: 50000, rate: 1.50, avgTime: "2-8 ساعات", description: "متابعين حقيقيين مع تفاعل" },
    { id: 7, name: "متابعين تويتر", category: "twitter", min: 100, max: 20000, rate: 1.80, avgTime: "2-6 ساعات", description: "متابعين حقيقيين مستهدفين" },
    { id: 8, name: "أعضاء تيليجرام", category: "telegram", min: 50, max: 20000, rate: 2.50, avgTime: "1-4 ساعات", description: "أعضاء حقيقيون للقنوات والمجموعات" },
  ];

  const filteredServices = services.filter(service => {
    if (categoryFilter !== "all" && service.category !== categoryFilter) return false;
    if (search && !service.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
      <div className="rounded-2xl bg-gradient-to-br from-[var(--site-primary)]/20 to-[var(--site-secondary)]/20 border border-[var(--site-primary)]/30 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">متجر الخدمات</h1>
            <p className="mt-1 text-zinc-400">تصفح واطلب أفضل الخدمات الرقمية بأفضل الأسعار</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input 
              type="text" 
              placeholder="ابحث عن خدمة..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--site-primary)]"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-2 min-w-max">
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                categoryFilter === cat.id
                  ? "bg-[var(--site-primary)] text-black"
                  : "border border-white/10 bg-white/5 text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{typeof cat.icon === "function" ? <cat.icon /> : cat.icon}</span>
              <span>{cat.name}</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {services.filter(s => {
          if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
          if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        }).map((service) => (
          <Link key={service.id} href={`/sites/${slug}/services/${service.id}`} className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-[var(--site-primary)]/50 hover:bg-white/10 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{service.category === "instagram" ? "📷" : service.category === "youtube" ? "▶️" : service.category === "tiktok" ? "🎵" : service.category === "twitter" ? "🐦" : service.category === "telegram" ? "✈️" : "📘"}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-zinc-400 uppercase">{service.category}</span>
                </div>
                <h3 className="font-black text-white truncate group-hover:text-[var(--site-primary)] transition-colors">{service.name}</h3>
                <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{service.description}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--site-primary)]/15 text-[var(--site-primary)]">
                <Package className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <Clock className="h-3 w-3" />
                <span>{service.avgTime}</span>
              </div>
              <div className="flex-1" />
              <div className="text-right">
                <p className="text-xs text-zinc-500">السعر لكل 1000</p>
                <p className="font-black text-[var(--site-primary)]">{service.rate.toFixed(2)} $</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400">الحد الأدنى: {service.min}</span>
              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">الحد الأقصى: {service.max.toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>

      {expired && (
        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-center text-sm font-bold text-amber-100">
          المنصة متوقفة مؤقتاً لانتهاء الاشتراك. لا يمكن طلب خدمات جديدة حالياً.
        </div>
      )}
    </div>
  );
}

const services = [
  { id: 1, name: "متابعين انستقرام حقيقيين", category: "instagram", min: 100, max: 50000, rate: 0.85, avgTime: "1-6 ساعة", description: "متابعين حقيقيين ونشطين مع ضمان عدم النقص", count: 45 },
  { id: 2, name: "لايكات انستقرام", category: "instagram", min: 50, max: 10000, rate: 0.45, avgTime: "فوري - 30 دقيقة", description: "لايكات من حسابات حقيقية", count: 45 },
  { id: 3, name: "مشاهدات يوتيوب", category: "youtube", min: 1000, max: 1000000, rate: 0.35, avgTime: "1-12 ساعة", description: "مشاهدات حقيقية مع احتفاظ عالي", count: 32 },
  { id: 4, name: "مشتركين يوتيوب", category: "youtube", min: 100, max: 10000, rate: 1.20, avgTime: "6-24 ساعة", description: "مشتركين حقيقيين مع تفاعل", count: 32 },
  { id: 5, name: "مشاهدات تيك توك", category: "tiktok", min: 500, max: 500000, rate: 0.25, avgTime: "فوري - ساعة", description: "مشاهدات حقيقية من حسابات نشطة", count: 28 },
  { id: 6, name: "متابعين تيك توك", category: "tiktok", min: 100, max: 50000, rate: 1.50, avgTime: "2-8 ساعات", description: "متابعين حقيقيين مع تفاعل", count: 28 },
  { id: 7, name: "متابعين تويتر", category: "twitter", min: 100, max: 20000, rate: 1.80, avgTime: "2-6 ساعات", description: "متابعين حقيقيين مستهدفين", count: 22 },
  { id: 8, name: "أعضاء تيليجرام", category: "telegram", min: 50, max: 20000, rate: 2.50, avgTime: "1-4 ساعات", description: "أعضاء حقيقيون للقنوات والمجموعات", count: 18 },
];

export default function ServicesContent({ slug, siteName, primary, secondary, expired }: { slug: string; siteName: string; primary: string; secondary: string; expired: boolean }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = [
    { id: "all", name: "الكل", icon: () => <Package className="h-4 w-4" />, count: services.reduce((a, s) => a + s.count, 0) },
    { id: "instagram", name: "Instagram", icon: () => <span>📷</span>, count: 45 },
    { id: "youtube", name: "YouTube", icon: () => <span>▶️</span>, count: 32 },
    { id: "tiktok", name: "TikTok", icon: () => <span>🎵</span>, count: 28 },
    { id: "twitter", name: "Twitter/X", icon: () => <span>🐦</span>, count: 22 },
    { id: "telegram", name: "Telegram", icon: () => <span>✈️</span>, count: 18 },
    { id: "facebook", name: "Facebook", icon: () => <span>📘</span>, count: 15 },
    { id: "snapchat", name: "Snapchat", icon: () => <span>👻</span>, count: 12 },
    { id: "spotify", name: "Spotify", icon: () => <span>🎧</span>, count: 10 },
  ];

  return (
    <div className="space-y-6" style={{ "--site-primary": primary, "--site-secondary": secondary } as React.CSSProperties}>
      <div className="rounded-2xl bg-gradient-to-br from-[var(--site-primary)]/20 to-[var(--site-secondary)]/20 border border-[var(--site-primary)]/30 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">متجر الخدمات</h1>
            <p className="mt-1 text-zinc-400">تصفح واطلب أفضل الخدمات الرقمية بأفضل الأسعار</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input 
              type="text" 
              placeholder="ابحث عن خدمة..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-[var(--site-primary)]"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-2 min-w-max">
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                categoryFilter === cat.id
                  ? "bg-[var(--site-primary)] text-black"
                  : "border border-white/10 bg-white/5 text-zinc-400 hover:border-[var(--site-primary)]/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{typeof cat.icon === "function" ? <cat.icon /> : cat.icon}</span>
              <span>{cat.name}</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-500">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {services.filter(s => {
          if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
          if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        }).map((service) => (
          <Link key={service.id} href={`/sites/${slug}/services/${service.id}`} className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-[var(--site-primary)]/50 hover:bg-white/10 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{service.category === "instagram" ? "📷" : service.category === "youtube" ? "▶️" : service.category === "tiktok" ? "🎵" : service.category === "twitter" ? "🐦" : service.category === "telegram" ? "✈️" : "📘"}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-zinc-400 uppercase">{service.category}</span>
                </div>
                <h3 className="font-black text-white truncate group-hover:text-[var(--site-primary)] transition-colors">{service.name}</h3>
                <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{service.description}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--site-primary)]/15 text-[var(--site-primary)]">
                <Package className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <Clock className="h-3 w-3" />
                <span>{service.avgTime}</span>
              </div>
              <div className="flex-1" />
              <div className="text-right">
                <p className="text-xs text-zinc-500">السعر لكل 1000</p>
                <p className="font-black text-[var(--site-primary)]">{service.rate.toFixed(2)} $</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400">الحد الأدنى: {service.min}</span>
              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">الحد الأقصى: {service.max.toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>

      {expired && (
        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-center text-sm font-bold text-amber-100">
          المنصة متوقفة مؤقتاً لانتهاء الاشتراك. لا يمكن طلب خدمات جديدة حالياً.
        </div>
      )}
    </div>
  );
}