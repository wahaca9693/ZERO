import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  return <div className="space-y-4"><h1 className="text-2xl font-black text-white">منصاتي</h1><p className="text-sm text-zinc-400">أنت حالياً داخل فرعك — لا توجد منصات أخرى خاصة بك.</p><div className="rounded-3xl border border-white/5 bg-white/[0.03] p-8 text-center"><p className="text-sm text-zinc-500">رابط فرعك الحالي محفوظ في حسابك.</p></div></div>;
}
