import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
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

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const response = NextResponse.json({});
    const session = await getIronSession(request, response, opts);
    if (!session.userId || session.siteSlug !== slug) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    await initDb();
    const result = await db.execute({
      sql: "SELECT id, username, email, balance, role FROM reseller_accounts WHERE id = ? LIMIT 1",
      args: [session.userId],
    });
    const user = result.rows[0] as { id: number; username: string; email: string; balance: number; role: string } | undefined;
    if (!user) return NextResponse.json({ authenticated: false }, { status: 404 });
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}