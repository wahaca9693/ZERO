import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { db } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session/edge";

const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_chars_long_for_security",
  cookieName: "reseller_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json().catch(() => ({})).then(() => {
      const url = new URL(request.url);
      const parts = url.pathname.split("/");
      return parts[parts.indexOf("sites") + 1];
    });
    
    if (!slug) {
      return NextResponse.json({ error: "الموقع غير محدد" }, { status: 400 });
    }

    await initDb();
    const loaded = await (await import("@/lib/reseller-sites")).loadPublicSite(slug);
    if (!loaded.site) {
      return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    }

    const body = await request.json();
    const { username, email, password, termsAccepted } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
    }

    // Check if user already exists in this site
    const existing = await db.execute({
      sql: "SELECT id FROM reseller_accounts WHERE site_id = ? AND (username = ? OR email = ?) LIMIT 1",
      args: [Number((await import("@/lib/reseller-sites")).loadPublicSite(slug)).site?.id || 0, username, email]
    });

    // Get site ID
    const siteResult = await db.execute({ sql: "SELECT id FROM reseller_sites WHERE slug = ? LIMIT 1", args: [slug] });
    const siteId = Number(siteResult.rows[0]?.id || 0);
    
    if (!siteId) {
      return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    }

    const existingUser = await db.execute({
      sql: "SELECT id FROM reseller_accounts WHERE site_id = ? AND (username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE) LIMIT 1",
      args: [siteId, username, email]
    });

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    await db.execute({
      sql: "INSERT INTO reseller_accounts (site_id, username, email, password_hash, role, terms_accepted) VALUES (?, ?, ?, ?, 'user', ?)",
      args: [siteId, username, email.toLowerCase(), passwordHash, termsAccepted ? 1 : 0]
    });

    const response = NextResponse.json({ success: true, message: "تم إنشاء الحساب بنجاح" });
    
    // Create session
    const session = await getIronSession(request, response, {
      password: process.env.SESSION_SECRET || "complex_password_at_least_32_chars_long_for_security",
      cookieName: "reseller_session",
      cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" }
    });
    
    const newUser = await db.execute({
      sql: "SELECT id, username, email, role FROM reseller_accounts WHERE site_id = ? AND username = ? LIMIT 1",
      args: [siteId, username]
    });
    
    if (newUser.rows[0]) {
      session.userId = Number(newUser.rows[0].id);
      session.slug = slug;
      session.username = newUser.rows[0].username;
      session.email = newUser.rows[0].email;
      session.role = newUser.rows[0].role;
      await session.save();
    }

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "تعذر إنشاء الحساب" }, { status: 500 });
  }
}