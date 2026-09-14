import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import { requireSiteAuth } from "@/lib/session";
import {
  getAdminRow,
  customerLogin,
  customerVerify,
  topupCard,
  startTransfer,
  confirmTransfer,
  resendTransferOtp,
} from "@/lib/asiacell-gateway";

type CustomerActionBody = {
  action?: unknown;
  phone?: unknown;
  sessionId?: unknown;
  otp?: unknown;
  voucher?: unknown;
  amount?: unknown;
};

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const admin = await getAdminRow();
    return NextResponse.json({
      connected: !!admin?.store_phone || !!admin?.phone,
      admin_connected: !!admin?.authenticated,
      store_phone: admin?.store_phone || admin?.phone || "",
      exchange_rate: admin?.exchange_rate || 1666,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 401 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const userSession = auth.session;
    const body: CustomerActionBody = await request.json();
    const action = body.action;
    const admin = await getAdminRow();

    // Site-targeted credit: resolve site+account for branch deposits
    const loaded = await loadPublicSite(slug);
    const siteTarget = loaded.site
      ? { siteId: Number(loaded.site.id), accountId: userSession.userId! }
      : null;

    if (action === "login") {
      const result = await customerLogin(userSession.userId!, stringValue(body.phone));
      return NextResponse.json(result);
    }

    if (action === "verify-otp") {
      const result = await customerVerify(stringValue(body.sessionId), stringValue(body.otp));
      return NextResponse.json(result);
    }

    if (action === "topup") {
      const sessionId = stringValue(body.sessionId).trim() || undefined;
      const result = await topupCard(userSession.userId!, sessionId, stringValue(body.voucher), admin, siteTarget);
      return NextResponse.json(result);
    }

    if (action === "transfer") {
      const result = await startTransfer(userSession.userId!, stringValue(body.sessionId), Number(body.amount), admin);
      return NextResponse.json(result);
    }

    if (action === "confirm") {
      const result = await confirmTransfer(userSession.userId!, stringValue(body.sessionId), stringValue(body.otp), admin, siteTarget);
      return NextResponse.json(result);
    }

    if (action === "resend") {
      const result = await resendTransferOtp(stringValue(body.sessionId));
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[Asiacell Customer Branch]", error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
