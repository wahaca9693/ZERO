import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import { sessionOptions, type SessionUser } from "@/lib/session";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { username, email, password, termsAccepted } = await request.json();
    await initDb();

    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });
    if (!termsAccepted) return NextResponse.json({ error: "يجب الموافقة على الشروط" }, { status: 400 });
    if (!password || password.length < 8) return NextResponse.json({ error: "كلمة المرور 8 أحرف على الأقل" }, { status: 400 });

    const password_hash = await bcrypt.hash(password, 10);
    try {
      await db.execute({
        sql: "INSERT INTO reseller_accounts (site_id, username, email, password_hash, role, balance, terms_accepted) VALUES (?, ?, ?, ?, 'user', 0, 1)",
        args: [loaded.site.id, username, email?.toLowerCase(), password_hash],
      });
    } catch {
      return NextResponse.json({ error: "اسم المستخدم أو البريد مستخدم بالفعل" }, { status: 409 });
    }

    const result = await db.execute({
      sql: "SELECT id, role FROM reseller_accounts WHERE username = ? AND site_id = ? LIMIT 1",
      args: [username, loaded.site.id],
    });
    const user = result.rows[0] as unknown as { id: number; role: string } | undefined;

    if (user) {
      const cookieStore = await cookies();
      const session = await getIronSession<SessionUser>(cookieStore, sessionOptions);
      session.userId = user.id;
      session.siteSlug = slug;
      session.role = user.role;
      await session.save();
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "تعذر إنشاء الحساب" }, { status: 500 });
  }
}