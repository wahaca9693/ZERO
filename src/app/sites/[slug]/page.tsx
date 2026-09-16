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
 * If the site is suspended, show the suspension notice instead.
 */
export default async function SiteRootPage({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  if (String(loaded.site.status) === "suspended") {
    return (
      <SuspendedNotice slug={slug} siteName={String(loaded.site.display_name)} reason={loaded.site.suspended_reason ? String(loaded.site.suspended_reason) : null} />
    );
  }
  redirect(`/sites/${encodeURIComponent(slug)}/services`);
}

function SuspendedNotice({ slug, siteName, reason }: { slug: string; siteName: string; reason: string | null }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: "#0b0b09", color: "#fff", fontFamily: "system-ui, sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 420, width: "100%", margin: "0 auto", padding: 24, textAlign: "center" }}>
          <div style={{ background: "linear-gradient(145deg,#221a0b,#150f06)", border: "1px solid rgba(212,175,55,.25)", borderRadius: 24, padding: 36, boxShadow: "0 20px 60px -20px rgba(0,0,0,.8)" }}>
            <div style={{ width: 64, height: 64, margin: "0 auto 18px", borderRadius: "50%", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
              ⛔
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900 }}>المنصة متوقفة مؤقتاً</h1>
            <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,.6)", fontSize: 14, lineHeight: 1.7 }}>
              تم إيقاف هذه المنصة ({siteName}) بسبب مخالفة شروط الاستخدام.
              {reason ? <><br /><strong style={{ color: "#fca5a5" }}>السبب: {reason}</strong></> : null}
            </p>
            <p style={{ margin: 0, color: "rgba(255,255,255,.4)", fontSize: 12 }}>
              إذا كنت صاحب المنصة، تواصل مع الدعم الفني لإعادة تفعيلها.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}