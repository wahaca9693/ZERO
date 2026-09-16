import { db } from "@/lib/db";

type Row = Record<string, unknown>;

export function publicSiteUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/$/, "")}/sites/${encodeURIComponent(slug)}`;
}

export function isSubscriptionExpired(nextBillingAt: unknown): boolean {
  if (!nextBillingAt) return false;
  const time = new Date(String(nextBillingAt)).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

export async function loadPublicSite(slug: string): Promise<{ site: Row | null; expired: boolean }> {
  const result = await db.execute({
    sql: "SELECT id, slug, display_name, status, subscription_status, subscription_price, subscription_currency, next_billing_at, theme_json, payment_methods_json, provider_access_enabled, suspended_reason FROM reseller_sites WHERE slug = ? LIMIT 1",
    args: [slug],
  });
  const site = (result.rows[0] as Row | undefined) || null;
  const expired = isSubscriptionExpired(site?.next_billing_at);
  return { site, expired };
}

export function publicSiteData(site: Row, origin: string, expired: boolean) {
  return {
    slug: String(site.slug),
    displayName: String(site.display_name),
    status: expired ? "expired" : String(site.status),
    subscriptionStatus: expired ? "expired" : String(site.subscription_status),
    subscriptionPrice: Number(site.subscription_price || 0),
    subscriptionCurrency: String(site.subscription_currency || "USD"),
    nextBillingAt: site.next_billing_at ?? null,
    publicUrl: publicSiteUrl(origin, String(site.slug)),
    theme: parseJson(site.theme_json, {}),
    paymentMethods: parseJson(site.payment_methods_json, []),
    providerAccessEnabled: Number(site.provider_access_enabled || 0) === 1,
    suspendedReason: site.suspended_reason ? String(site.suspended_reason) : null,
  };
}

function parseJson(value: unknown, fallback: unknown) {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
