import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import AsiacellClient from "./AsiacellClient";

type Props = { params: Promise<{ slug: string }> };

export default async function AsiacellAdminPage({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  return <AsiacellClient slug={slug} />;
}
