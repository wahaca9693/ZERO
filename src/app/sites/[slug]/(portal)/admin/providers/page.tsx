import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import BranchProvidersPage from "./BranchProvidersPage";

export const metadata = { title: "المزودون والخدمات | لوحة الإدارة" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  return <BranchProvidersPage slug={slug} />;
}