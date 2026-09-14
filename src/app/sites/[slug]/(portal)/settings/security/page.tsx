import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  return <div className="space-y-4"><h1 className="text-2xl font-black text-white">إعدادات الأمان</h1><p className="text-sm text-zinc-400">إدارة حماية الحساب ورموز الأمان</p></div>;
}
