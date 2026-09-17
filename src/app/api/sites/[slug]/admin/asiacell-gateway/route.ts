import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";
import {
  adminLoginForSite,
  adminVerifyForSite,
  adminLogout,
  cleanPhone,
  checkRecordsAndCredit,
  getSiteAdminRow,
  setSiteAdminRow,
} from "@/lib/asiacell-gateway";

type Params = { params: Promise<{ slug: string }> };

type AdminActionBody = {
  action?: unknown;
  phone?: unknown;
  otp?: unknown;
  rate?: unknown;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function authStatus(error: unknown): number {
  const message = errorMessage(error);
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden" || message === "Account banned") return 403;
  return 500;
}

// Reseller-scoped admin row read/write is now in @/lib/asiacell-gateway
// (getSiteAdminRow / setSiteAdminRow)

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);
    const admin = await getSiteAdminRow(siteId);
    return NextResponse.json({
      authenticated: admin?.authenticated ? Boolean(admin.authenticated) : false,
      phone: admin?.phone || "",
      exchange_rate: admin?.exchange_rate || 1666,
      store_phone: admin?.store_phone || admin?.phone || "",
    });
  } catch (error: unknown) {
    const status = authStatus(error);
    return NextResponse.json({ error: status === 401 ? "يرجى تسجيل الدخول" : "تعذر تحميل حالة آسياسيل" }, { status });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);
    const body: AdminActionBody = await request.json();
    const action = body.action;

    if (action === "login") {
      const result = await adminLoginForSite(siteId, typeof body.phone === "string" ? body.phone : "");
      return NextResponse.json(result);
    }

    if (action === "verify") {
      const result = await adminVerifyForSite(siteId, typeof body.otp === "string" ? body.otp : "");
      return NextResponse.json(result);
    }

    if (action === "logout") {
      await adminLogout();
      await setSiteAdminRow(siteId, { authenticated: 0, access_token: "", pid: "" });
      return NextResponse.json({ success: true });
    }

    if (action === "set-store-phone") {
      const phone = cleanPhone(typeof body.phone === "string" ? body.phone : "");
      if (!/^07\d{9}$/.test(phone)) {
        return NextResponse.json({ error: "رقم آسياسيل يجب أن يكون 07XXXXXXXXX" }, { status: 400 });
      }
      const admin = await getSiteAdminRow(siteId);
      if (!admin?.authenticated || !admin.access_token || cleanPhone(admin.phone || "") !== phone) {
        return NextResponse.json({
          error: "رقم الاستلام يحتاج تحققاً: اربط هذا الرقم برمز التحقق أولاً ثم احفظه كرقم المتجر.",
          requiresVerification: true,
        }, { status: 409 });
      }
      await setSiteAdminRow(siteId, { store_phone: phone });
      return NextResponse.json({ success: true, store_phone: phone });
    }

    if (action === "set-rate") {
      const rate = Number(body.rate);
      if (!Number.isFinite(rate) || rate <= 0 || rate > 1_000_000_000) {
        return NextResponse.json({ error: "سعر الصرف غير صالح" }, { status: 400 });
      }
      await setSiteAdminRow(siteId, { exchange_rate: rate });
      return NextResponse.json({ success: true, exchange_rate: rate });
    }

    if (action === "check-records") {
      const result = await checkRecordsAndCredit();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: unknown) {
    const status = authStatus(error);
    if (status >= 500) console.error("[Asiacell Branch Admin]", error);
    return NextResponse.json({ error: "تعذر تنفيذ إجراء Asiacell" }, { status });
  }
}