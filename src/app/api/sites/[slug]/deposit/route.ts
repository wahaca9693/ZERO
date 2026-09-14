import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import { requireSiteAuth } from "@/lib/session";
import {
  customerLogin,
  customerVerify,
  topupCard,
  startTransfer,
  confirmTransfer,
  resendTransferOtp,
  getAdminRow,
} from "@/lib/asiacell-gateway";

type Params = { params: Promise<{ slug: string }> };

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

type PaymentMethod = { name: string; instructions: string; enabled: boolean };

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
    const site = publicSiteData(loaded.site, origin, loaded.expired);

    const methods = (site.paymentMethods as { name: string; instructions: string; enabled: boolean }[] | undefined) || [];
    const enabled = methods.filter((method) => method.enabled !== false);

    return NextResponse.json({ paymentMethods: enabled });
  } catch (error) {
    console.error("[site-deposit]", error);
    return NextResponse.json({ error: "تعذر تحميل طرق الدفع" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const action = String(body.action || "");

    const admin = await getAdminRow();

    // Get site + owner for official wallet linking
    const loaded = await loadPublicSite(slug);
    const siteId = loaded.site ? Number(loaded.site.id) : 0;
    const ownerResult = siteId
      ? await db.execute({ sql: "SELECT owner_user_id FROM reseller_sites WHERE id = ? LIMIT 1", args: [siteId] })
      : null;
    const ownerUserId = ownerResult?.rows[0] ? Number((ownerResult.rows[0] as unknown as Record<string, unknown>).owner_user_id) : 0;

    const siteTarget = loaded.site
      ? { siteId: Number(loaded.site.id), accountId: auth.session.userId! }
      : null;

    if (action === "asiacell-login") {
      const result = await customerLogin(auth.session.userId!, String(body.phone || ""));
      return NextResponse.json(result);
    }
    if (action === "asiacell-verify-otp") {
      const result = await customerVerify(String(body.sessionId || ""), String(body.otp || ""));
      return NextResponse.json(result);
    }
    if (action === "asiacell-topup") {
      const sessionId = String(body.sessionId || "").trim() || undefined;
      const result = await topupCard(auth.session.userId!, sessionId, String(body.voucher || ""), admin, siteTarget);
      // Also credit OFFICIAL wallet (owner)
      if (ownerUserId > 0 && result.success && result.credited) {
        await db.execute({
          sql: "UPDATE users SET balance = balance + ? WHERE id = ?",
          args: [result.credited, ownerUserId],
        });
        await db.execute({
          sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'asiacell')",
          args: [ownerUserId, result.credited, `شحن آسياسيل فرع ${slug}: ${result.message}`],
        });
      }
      return NextResponse.json(result);
    }
    if (action === "asiacell-transfer") {
      const result = await startTransfer(auth.session.userId!, String(body.sessionId || ""), Number(body.amount || 0), admin);
      return NextResponse.json(result);
    }
    if (action === "asiacell-confirm") {
      const result = await confirmTransfer(auth.session.userId!, String(body.sessionId || ""), String(body.otp || ""), admin, siteTarget);
      // Also credit OFFICIAL wallet
      if (ownerUserId > 0 && result.success && result.credited) {
        await db.execute({
          sql: "UPDATE users SET balance = balance + ? WHERE id = ?",
          args: [result.credited, ownerUserId],
        });
        await db.execute({
          sql: "INSERT INTO transactions (user_id, type, amount, status, description, method) VALUES (?, 'deposit', ?, 'completed', ?, 'asiacell')",
          args: [ownerUserId, result.credited, `تحويل آسياسيل فرع ${slug}: ${result.message}`],
        });
      }
      return NextResponse.json(result);
    }
    if (action === "asiacell-resend") {
      const result = await resendTransferOtp(String(body.sessionId || ""));
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    console.error("[site-deposit-post]", error);
    return NextResponse.json({ error: "تعذر معالجة طلب الشحن" }, { status: 500 });
  }
}
