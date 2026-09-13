import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";

const opts = {
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

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { username, password } = await request.json();
    await initDb();

    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });

    const result = await db.execute({
      sql: "SELECT id, password_hash, role FROM reseller_accounts WHERE username = ? AND site_id = ? LIMIT 1",
      args: [username, loaded.site.id],
    });
    const user = result.rows[0] as unknown as { id: number; password_hash: string; role: string } | undefined;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    const session = await getIronSession(request, response, opts);
    session.userId = user.id;
    session.siteSlug = slug;
    session.role = user.role;
    await session.save();
    return response;
  } catch {
    return NextResponse.json({ error: "تعذر تسجيل الدخول" }, { status: 500 });
  }
}