import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { db } from "@/lib/db";
import { loadPublicSite } from "@/lib/reseller-sites";
import bcrypt from "bcryptjs";
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

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { username, password } = await request.json();

    await initDb();
    const loaded = await (await import("@/lib/reseller-sites")).loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const result = await db.execute({
      sql: "SELECT id, password_hash FROM reseller_accounts WHERE username = ? AND site_id = ?",
      args: [username, loaded.site.id],
    });

    const user = (result.rows as any[])[0];
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const response = NextResponse.json({ success: true, message: "Logged in successfully" });
    const session = await getIronSession(request, response, sessionOptions);
    
    session.userId = user.id;
    session.slug = slug;
    await session.save();

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}