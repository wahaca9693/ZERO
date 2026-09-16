import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import TicketsClient from "./TicketsClient";

type Props = { params: Promise<{ slug: string }> };

export default async function TicketsPage({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  return <TicketsClient slug={slug} />;
}
