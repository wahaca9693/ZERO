import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  clearOkxConfig,
  getOkxConfigStatus,
  OkxConfigurationError,
  OkxRequestError,
  saveOkxConfig,
  testOkxConnection,
} from "@/lib/okx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function value(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

function publicStatus(status: Awaited<ReturnType<typeof getOkxConfigStatus>>) {
  return {
    configured: status.configured,
    source: status.source,
    updatedAt: status.updatedAt,
    apiKeyStored: status.configured,
  };
}

async function audit(adminUserId: number | undefined, action: string, details: Record<string, unknown>) {
  await db.execute({
    sql: "INSERT INTO admin_audit_logs (admin_user_id, action, details) VALUES (?, ?, ?)",
    args: [adminUserId ?? null, action, JSON.stringify(details)],
  });
}

export async function GET() {
  try {
    await requireAdmin();
    return json({ settings: publicStatus(await getOkxConfigStatus()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول بحساب Admin ثم إعادة المحاولة." }, 401);
    if (message === "Forbidden") return json({ error: "الحساب الحالي ليس Admin. سجّل الخروج ثم ادخل بحساب Admin الصحيح." }, 403);
    if (message === "2FA_REQUIRED") return json({ error: "أكمل تحقق رمز الأمان لحساب Admin ثم أعد المحاولة." }, 403);
    if (message === "Account banned") return json({ error: "حساب Admin محظور حاليًا." }, 403);
    return json({ error: "تعذر قراءة إعداد OKX" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = value(body.action).toLowerCase() || "save";
    const input = {
      apiKey: value(body.apiKey),
      secretKey: value(body.secretKey),
      passphrase: value(body.passphrase),
      baseUrl: value(body.baseUrl),
    };

    if (action === "clear") {
      const status = await clearOkxConfig();
      await audit(admin.userId, "clearOkxConfig", { source: status.source, configured: status.configured });
      return json({ success: true, settings: publicStatus(status), message: "تم حذف إعداد OKX المخزن في لوحة الإدارة. إذا كانت متغيرات البيئة موجودة فستظل هي المصدر الفعّال." });
    }

    if (action !== "test" && action !== "save") return json({ error: "إجراء OKX غير صالح" }, 400);
    await testOkxConnection(input);
    if (action === "test") {
      await audit(admin.userId, "testOkxConfig", { readOnly: true, success: true });
      return json({ success: true, settings: publicStatus(await getOkxConfigStatus()), message: "نجح اختبار اتصال OKX بصلاحية القراءة." });
    }

    const status = await saveOkxConfig(input);
    await audit(admin.userId, "saveOkxConfig", { readOnly: true, source: status.source, configured: status.configured });
    return json({ success: true, settings: publicStatus(status), message: "تم حفظ إعداد OKX المشفّر ونجح اختبار القراءة." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول بحساب Admin ثم إعادة المحاولة." }, 401);
    if (message === "Forbidden") return json({ error: "الحساب الحالي ليس Admin. سجّل الخروج ثم ادخل بحساب Admin الصحيح." }, 403);
    if (message === "2FA_REQUIRED") return json({ error: "أكمل تحقق رمز الأمان لحساب Admin ثم أعد المحاولة." }, 403);
    if (message === "Account banned") return json({ error: "حساب Admin محظور حاليًا." }, 403);
    if (error instanceof OkxConfigurationError) return json({ error: "أدخل API Key وSecret Key وPassphrase صحيحة، أو أضف INTEGRATION_SECRETS_KEY في Vercel أولًا." }, 400);
    if (error instanceof OkxRequestError) {
      const detail = error.code === "50101" ? "بيانات اعتماد OKX غير صحيحة." : error.code === "50102" ? "وقت خادم التطبيق غير متزامن مع OKX." : error.code === "50103" ? "صلاحية API لا تسمح بهذا الطلب." : "تحقق من المفتاح والصلاحيات والـPassphrase والـIP whitelist وعنوان REST الإقليمي.";
      return json({ error: `فشل اختبار القراءة من OKX: ${detail}` }, 502);
    }
    console.error("Admin OKX configuration failed", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "تعذر حفظ إعداد OKX حاليًا" }, 500);
  }
}
