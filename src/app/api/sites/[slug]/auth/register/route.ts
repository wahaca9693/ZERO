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
    const { username, email, password } = await request.json();

    await initDb();
    const loaded = await (await import("@/lib/reseller-sites")).loadPublicSite(slug);
    if (!loaded.site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await db.execute({
      sql: "INSERT INTO reseller_accounts (site_id, username, email, password_hash) VALUES (?, ?, ?, ?)",
      args: [loaded.site.id, username, email, passwordHash],
    });

    const response = NextResponse.json({ success: true, message: "Account created successfully" });
    const session = await getIronSession(request, response, sessionOptions);
    
    // Get the new user id
    const user = await db.execute({
      sql: "SELECT id FROM reseller_accounts WHERE username = ? AND site_id = ?",
      args: [username, loaded.site.id],
    });

    session.userId = (user.rows as any[])[0]?.id;
    session.slug = slug;
    await session.save();

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}