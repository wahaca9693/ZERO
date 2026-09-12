import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { db } from "@/lib/db";
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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    const slug = parts[parts.indexOf("sites") + 1];
    
    if (!slug) {
      return NextResponse.json({ error: "الموقع غير محدد" }, { status: 400 });
    }

    const response = NextResponse.next();
    const session = await getIronSession(request, response, {
      password: process.env.SESSION_SECRET || "complex_password_at_least_32_chars_long_for_security",
      cookieName: "reseller_session",
      cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" }
    });

    if (!session.userId || session.slug !== slug) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    await initDb();
    
    const userResult = await db.execute({
      sql: "SELECT id, username, email, role, balance, is_2fa_enabled, created_at FROM reseller_accounts WHERE id = ? AND site_id = (SELECT id FROM reseller_sites WHERE slug = ? LIMIT 1) LIMIT 1",
      args: [session.userId, slug]
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const user = userResult.rows[0];

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: Number(user.balance || 0),
        is_2fa_enabled: Number(user.is_2fa_enabled || 0) === 1,
        created_at: user.created_at,
      },
      notifications: [],
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "تعذر جلب بيانات المستخدم" }, { status: 500 });
  }
}