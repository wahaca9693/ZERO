import { notFound } from "next/navigation";
import { getResellerSite } from "@/lib/reseller-auth";
import BranchProvidersPage from "./BranchProvidersPage";

export const metadata = { title: "المزودون والخدمات | لوحة الإدارة" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getResellerSite(slug);
  if (!site) notFound();
  return <BranchProvidersPage slug={slug} />;
}