import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";
import { adminLogin, adminVerify, adminLogout, cleanPhone, checkRecordsAndCredit } from "@/lib/asiacell-gateway";

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

// Reseller-scoped admin row read/write instead of the global asiacell_admin
async function getSiteAdminRow(siteId: number) {
  const result = await db.execute({
    sql: "SELECT * FROM reseller_asiacell_admin WHERE site_id = ? LIMIT 1",
    args: [siteId],
  });
  const row = result.rows[0] as unknown as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    authenticated: Number(row.authenticated),
    exchange_rate: Number(row.exchange_rate),
  };
}

async function setSiteAdminRow(siteId: number, data: Record<string, unknown>): Promise<void> {
  const existing = await getSiteAdminRow(siteId);
  if (!existing) {
    await db.execute({
      sql: `INSERT INTO reseller_asiacell_admin (site_id, phone, device_id, access_token, pid, authenticated, exchange_rate, store_phone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        siteId,
        data.phone ? String(data.phone) : "",
        data.device_id ? String(data.device_id) : "",
        data.access_token ? String(data.access_token) : "",
        data.pid ? String(data.pid) : "",
        data.authenticated ? 1 : 0,
        data.exchange_rate ? Number(data.exchange_rate) : 1666,
        data.store_phone ? String(data.store_phone) : "",
      ],
    });
    return;
  }
  const updates: string[] = [];
  const args: Array<string | number> = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "site_id") continue;
    updates.push(`${key} = ?`);
    args.push(typeof value === "number" ? value : String(value));
  }
  if (updates.length === 0) return;
  updates.push("updated_at = CURRENT_TIMESTAMP");
  args.push(siteId);
  await db.execute({
    sql: `UPDATE reseller_asiacell_admin SET ${updates.join(", ")} WHERE site_id = ?`,
    args,
  });
}

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
      const result = await adminLogin(typeof body.phone === "string" ? body.phone : "");
      if (result.success) {
        // Store the phone on the site row immediately (device/token stored by global login)
        const globalRow = await db.execute({
          sql: "SELECT device_id, pid FROM asiacell_admin WHERE id = 1",
        });
        const g = globalRow.rows[0] as unknown as Record<string, unknown> | undefined;
        await setSiteAdminRow(siteId, {
          phone: typeof body.phone === "string" ? cleanPhone(body.phone) : "",
          device_id: g?.device_id || "",
          pid: g?.pid || "",
          authenticated: 0,
        });
      }
      return NextResponse.json(result);
    }

    if (action === "verify") {
      const result = await adminVerify(typeof body.otp === "string" ? body.otp : "");
      if (result.success) {
        const globalRow = await db.execute({
          sql: "SELECT device_id, access_token, pid, authenticated FROM asiacell_admin WHERE id = 1",
        });
        const g = globalRow.rows[0] as unknown as Record<string, unknown> | undefined;
        await setSiteAdminRow(siteId, {
          device_id: g?.device_id || "",
          access_token: g?.access_token || "",
          pid: g?.pid || "",
          authenticated: g?.authenticated ? 1 : 0,
        });
      }
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