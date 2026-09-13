import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { db } from "@/lib/db";
import { getIronSession } from "iron-session";

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

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const response = NextResponse.json({});
    const session = await getIronSession(request, response, sessionOptions);
    
    if (!session.userId || session.slug !== slug) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    await initDb();
    const result = await db.execute({
      sql: "SELECT id, username, email, balance, role FROM reseller_accounts WHERE id = ?",
      args: [session.userId],
    });

    const user = (result.rows as any[])[0];
    if (!user) return NextResponse.json({ authenticated: false }, { status: 404 });

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}