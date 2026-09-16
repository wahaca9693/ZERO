import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import { requireSiteAuth } from "@/lib/session";
import {
  type AdminSession,
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

    const loaded = await loadPublicSite(slug);
    const siteId = loaded.site ? Number(loaded.site.id) : 0;
    // Per-site Asiacell gateway settings (store phone + rate for THIS branch)
    const siteAdmin = siteId
      ? await db.execute({
          sql: "SELECT authenticated, store_phone, exchange_rate FROM reseller_asiacell_admin WHERE site_id = ? LIMIT 1",
          args: [siteId],
        })
      : null;
    const row = siteAdmin?.rows[0] as unknown as Record<string, unknown> | undefined;
    return NextResponse.json({
      connected: row ? Boolean(Number(row.authenticated)) : false,
      admin_connected: row ? Boolean(Number(row.authenticated)) : false,
      store_phone: row?.store_phone ? String(row.store_phone) : "",
      exchange_rate: row?.exchange_rate ? Number(row.exchange_rate) : 1666,
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

    // Per-site Asiacell admin row: store phone + exchange rate for THIS branch
    const loaded = await loadPublicSite(slug);
    const siteId = loaded.site ? Number(loaded.site.id) : 0;
    let admin: AdminSession | null = null;
    if (siteId) {
      const siteAdmin = await db.execute({
        sql: "SELECT * FROM reseller_asiacell_admin WHERE site_id = ? LIMIT 1",
        args: [siteId],
      });
      const srow = siteAdmin.rows[0] as unknown as Record<string, unknown> | undefined;
      if (srow) {
        admin = {
          ...(srow as unknown as AdminSession),
          id: Number(srow.id),
          authenticated: Number(srow.authenticated),
          exchange_rate: Number(srow.exchange_rate),
          store_phone: srow.store_phone ? String(srow.store_phone) : "",
          phone: srow.phone ? String(srow.phone) : "",
          device_id: srow.device_id ? String(srow.device_id) : "",
          access_token: srow.access_token ? String(srow.access_token) : "",
          pid: srow.pid ? String(srow.pid) : "",
        } as AdminSession;
      }
    }

    // Site-targeted credit: resolve site+account for branch deposits
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
