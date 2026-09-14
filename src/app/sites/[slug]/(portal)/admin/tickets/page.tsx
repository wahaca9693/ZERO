import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import ResellerAdminModule from "../_lib/AdminModule";

type Props = { params: Promise<{ slug: string }> };

export default async function TicketsPage({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
  const site = publicSiteData(loaded.site, origin, loaded.expired);
  const siteName = (site.theme as { siteName?: string }).siteName || site.displayName;
  void siteName;
  return <ResellerAdminModule slug={slug} title="تذاكر الدعم" description="إدارة طلبات المستخدمين ودعمهم" endpoint="/admin/tickets" icon="tickets"
    createLabel="رد على تذكرة"
    createFields={[{ key: "ticketId", label: "رقم التذكرة", type: "number" }, { key: "status", label: "الحالة", type: "select", options: ["open", "closed", "pending"] }, { key: "reply", label: "الرد", type: "textarea" }]} />;
}
