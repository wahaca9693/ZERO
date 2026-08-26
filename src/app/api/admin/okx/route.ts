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

function value(input: unknown, maxLength: number) {
  return typeof input === "string" ? input.trim().slice(0, maxLength) : "";
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
    if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول" }, 401);
    if (message === "Forbidden") return json({ error: "غير مصرح" }, 403);
    return json({ error: "تعذر قراءة إعداد OKX" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = value(body.action, 20).toLowerCase() || "save";
    const input = {
      apiKey: value(body.apiKey, 200),
      secretKey: value(body.secretKey, 512),
      passphrase: value(body.passphrase, 512),
      baseUrl: value(body.baseUrl, 200),
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
    if (message === "Unauthorized") return json({ error: "يرجى تسجيل الدخول" }, 401);
    if (message === "Forbidden") return json({ error: "غير مصرح" }, 403);
    if (error instanceof OkxConfigurationError) return json({ error: "أدخل API Key وSecret Key وPassphrase صحيحة، أو أضفها أولًا في متغيرات البيئة." }, 400);
    if (error instanceof OkxRequestError) return json({ error: "فشل اختبار القراءة من OKX. تحقق من المفتاح والصلاحيات والـPassphrase والـIP whitelist." }, 502);
    console.error("Admin OKX configuration failed", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "تعذر حفظ إعداد OKX حاليًا" }, 500);
  }
}
