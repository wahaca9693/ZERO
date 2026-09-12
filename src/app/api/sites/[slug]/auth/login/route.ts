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
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    const slug = parts[parts.indexOf("sites") + 1];
    
    if (!slug) {
      return NextResponse.json({ error: "الموقع غير محدد" }, { status: 400 });
    }

    await initDb();
    const loaded = await (await import("@/lib/reseller-sites")).loadPublicSite(slug);
    if (!loaded.site) {
      return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
    }

    // Get site ID
    const siteResult = await db.execute({ sql: "SELECT id FROM reseller_sites WHERE slug = ? LIMIT 1", args: [slug] });
    const siteId = Number(siteResult.rows[0]?.id || 0);
    
    if (!siteId) {
      return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    }

    // Find user
    const userResult = await db.execute({
      sql: "SELECT id, username, email, password_hash, role, is_2fa_enabled FROM reseller_accounts WHERE site_id = ? AND (username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE) LIMIT 1",
      args: [siteId, username, username]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    const user = userResult.rows[0] as any;
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    // Check 2FA
    if (user.is_2fa_enabled) {
      return NextResponse.json({ 
        requires2fa: true, 
        userId: user.id,
        message: "مطلوب التحقق بخطوتين" 
      }, { status: 200 });
    }

    const response = NextResponse.json({ 
      success: true, 
      message: "تم تسجيل الدخول بنجاح",
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
    
    // Create session
    const session = await getIronSession(request, response, {
      password: process.env.SESSION_SECRET || "complex_password_at_least_32_chars_long_for_security",
      cookieName: "reseller_session",
      cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" }
    });
    
    session.userId = user.id;
    session.slug = slug;
    session.username = user.username;
    session.email = user.email;
    session.role = user.role;
    await session.save();

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "تعذر تسجيل الدخول" }, { status: 500 });
  }
}