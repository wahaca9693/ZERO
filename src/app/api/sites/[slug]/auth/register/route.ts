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
      // First account ever registered on this site becomes its admin (site owner).
      const countRes = await db.execute({
        sql: "SELECT COUNT(*) as c FROM reseller_accounts WHERE site_id = ?",
        args: [loaded.site.id],
      });
      const isFirst = Number((countRes.rows[0] as Record<string, unknown>).c || 0) === 0;
      const role = isFirst ? "admin" : "user";

      await db.execute({
        sql: "INSERT INTO reseller_accounts (site_id, username, email, password_hash, role, balance, terms_accepted) VALUES (?, ?, ?, ?, ?, 0, 1)",
        args: [loaded.site.id, username, email?.toLowerCase(), password_hash, role],
      });

      // Re-read with the actual role (the one just inserted)
      const roleRes = await db.execute({
        sql: "SELECT id, role FROM reseller_accounts WHERE username = ? AND site_id = ? LIMIT 1",
        args: [username, loaded.site.id],
      });
      const newUser = roleRes.rows[0] as unknown as { id: number; role: string } | undefined;

      if (newUser) {
        const cookieStore = await cookies();
        const session = await getIronSession<SessionUser>(cookieStore, sessionOptions);
        session.userId = newUser.id;
        session.siteSlug = slug;
        session.role = newUser.role;
        await session.save();
      }
      return NextResponse.json({ success: true, role });
    } catch {
      return NextResponse.json({ error: "اسم المستخدم أو البريد مستخدم بالفعل" }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: "تعذر إنشاء الحساب" }, { status: 500 });
  }
}