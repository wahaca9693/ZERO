import { notFound, redirect } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * Root of a reseller sub-site. Mirrors the main platform exactly: like the
 * official "/" which redirects to /services, a sub-site "/" redirects to
 * "/sites/{slug}/services" — the full public service catalog.
 */
export default async function SiteRootPage({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  redirect(`/sites/${encodeURIComponent(slug)}/services`);
}