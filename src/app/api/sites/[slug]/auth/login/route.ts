import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, initDb } from "@/lib/db";
import { getResellerSession } from "@/lib/reseller-auth";
import { checkAuthRateLimit, clearAuthRateLimit, verifyTurnstileToken, SecurityServiceUnavailable } from "@/lib/security";

type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await initDb();
    const { slug } = await context.params;
    const body = await request.json() as { username?: unknown; password?: unknown; cfTurnstileToken?: unknown; turnstileToken?: unknown };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password) return NextResponse.json({ error: "يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور" }, { status: 400 });

    const siteResult = await db.execute({ sql: "SELECT id, status, next_billing_at FROM reseller_sites WHERE slug = ? LIMIT 1", args: [slug] });
    const site = siteResult.rows[0] as Record<string, unknown> | undefined;
    if (!site || String(site.status) !== "active" || (site.next_billing_at && new Date(String(site.next_billing_at)).getTime() <= Date.now())) return NextResponse.json({ error: "هذا الموقع متوقف أو انتهى اشتراكه" }, { status: 403 });

    const rate = await checkAuthRateLimit(request, "login", `site:${slug}:${username}`);
    if (!rate.allowed) return NextResponse.json({ error: "تم إيقاف محاولات الدخول مؤقتًا. حاول لاحقًا." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds || 900) } });
    const turnstile = await verifyTurnstileToken(request, body.cfTurnstileToken || body.turnstileToken, "auth");
    if (!turnstile.valid) return NextResponse.json({ error: turnstile.enabled ? "يرجى إكمال التحقق الأمني ثم إعادة المحاولة." : "تعذر التحقق من الطلب. أعد المحاولة بعد قليل." }, { status: 400 });

    const result = await db.execute({ sql: "SELECT id, username, password_hash, role, balance, is_banned FROM reseller_accounts WHERE site_id = ? AND (username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE) LIMIT 1", args: [Number(site.id), username, username] });
    const account = result.rows[0] as Record<string, unknown> | undefined;
    if (!account || Number(account.is_banned) === 1 || !(await bcrypt.compare(password, String(account.password_hash || "")))) return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });

    await clearAuthRateLimit(request, "login", `site:${slug}:${username}`);
    const session = await getResellerSession(slug);
    session.accountId = Number(account.id);
    session.siteId = Number(site.id);
    session.username = String(account.username);
    session.role = String(account.role) === "admin" ? "admin" : "user";
    session.isLoggedIn = true;
    await session.save();
    return NextResponse.json({ user: { username: account.username, role: session.role, balance: Number(account.balance || 0) } });
  } catch (error: unknown) {
    if (error instanceof SecurityServiceUnavailable) return NextResponse.json({ error: "حماية الدخول غير متاحة مؤقتًا." }, { status: 503 });
    console.error("Reseller login error", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "تعذر تسجيل الدخول حاليًا." }, { status: 500 });
  }
}
