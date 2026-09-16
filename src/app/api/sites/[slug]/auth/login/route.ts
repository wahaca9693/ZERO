import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, initDb } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import { sessionOptions, siteSessionOptions, type SessionUser } from "@/lib/session";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { username, password } = await request.json();
    await initDb();

    const loaded = await loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "الموقع غير موجود" }, { status: 404 });

    const result = await db.execute({
      sql: "SELECT id, password_hash, role FROM reseller_accounts WHERE username = ? AND site_id = ? LIMIT 1",
      args: [username, Number(loaded.site.id)],
    });
    const user = result.rows[0] as unknown as { id: number; password_hash: string; role: string } | undefined;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const session = await getIronSession<SessionUser>(cookieStore, siteSessionOptions(slug));
    session.userId = user.id;
    session.siteSlug = slug;
    session.role = user.role;
    await session.save();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "تعذر تسجيل الدخول" }, { status: 500 });
  }
}