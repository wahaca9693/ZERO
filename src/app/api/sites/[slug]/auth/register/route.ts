import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, initDb } from "@/lib/db";
import { getResellerSession } from "@/lib/reseller-auth";

type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await initDb();
    const { slug } = await context.params;
    const body = await request.json() as { username?: unknown; email?: unknown; password?: unknown; termsAccepted?: unknown };
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z0-9_]{3,32}$/.test(username)) return NextResponse.json({ error: "اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا إنجليزيًا صغيرًا أو رقمًا" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return NextResponse.json({ error: "كلمة المرور يجب أن تحتوي على 8 أحرف وحروف وأرقام" }, { status: 400 });
    if (body.termsAccepted !== true) return NextResponse.json({ error: "يجب الموافقة على شروط الموقع" }, { status: 400 });

    const siteResult = await db.execute({ sql: "SELECT id, status, next_billing_at FROM reseller_sites WHERE slug = ? LIMIT 1", args: [slug] });
    const site = siteResult.rows[0] as Record<string, unknown> | undefined;
    if (!site || String(site.status) !== "active" || (site.next_billing_at && new Date(String(site.next_billing_at)).getTime() <= Date.now())) return NextResponse.json({ error: "هذا الموقع متوقف أو انتهى اشتراكه" }, { status: 403 });
    const duplicate = await db.execute({ sql: "SELECT id FROM reseller_accounts WHERE site_id = ? AND (username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE) LIMIT 1", args: [Number(site.id), username, email] });
    if (duplicate.rows.length) return NextResponse.json({ error: "اسم المستخدم أو البريد مستخدم داخل هذا الموقع" }, { status: 409 });
    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await db.execute({ sql: "INSERT INTO reseller_accounts (site_id, username, email, password_hash, role, terms_accepted) VALUES (?, ?, ?, ?, 'user', 1)", args: [Number(site.id), username, email, passwordHash] });
    const session = await getResellerSession(slug);
    session.accountId = Number(inserted.lastInsertRowid);
    session.siteId = Number(site.id);
    session.username = username;
    session.role = "user";
    session.isLoggedIn = true;
    await session.save();
    return NextResponse.json({ user: { username, role: "user", balance: 0 } });
  } catch (error: unknown) {
    console.error("Reseller register error", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "تعذر إنشاء الحساب داخل الموقع حاليًا" }, { status: 500 });
  }
}
