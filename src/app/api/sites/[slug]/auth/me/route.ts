import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { sessionOptions, type SessionUser } from "@/lib/session";
import { getIronSession } from "iron-session";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const response = NextResponse.json({});
    const session = await getIronSession<SessionUser>(request, response, sessionOptions);
    if (!session.userId || session.siteSlug !== slug) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    await initDb();
    const result = await db.execute({
      sql: "SELECT id, username, email, balance, role FROM reseller_accounts WHERE id = ? LIMIT 1",
      args: [session.userId],
    });
    const user = result.rows[0] as unknown as { id: number; username: string; email: string; balance: number; role: string } | undefined;
    if (!user) return NextResponse.json({ authenticated: false }, { status: 404 });
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}