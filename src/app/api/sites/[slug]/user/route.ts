import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireSiteAuth } from "@/lib/session";

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/sites/{slug}/user
 * Returns the reseller account profile (subset matched to client needs).
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const result = await db.execute({
      sql: "SELECT id, username, email, balance, role, created_at FROM reseller_accounts WHERE id = ? LIMIT 1",
      args: [auth.session.userId!],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    return NextResponse.json({
      user: {
        id: Number(row.id),
        username: String(row.username || ""),
        email: row.email ? String(row.email) : "",
        balance: Number(row.balance || 0),
        role: String(row.role || "user"),
        created_at: String(row.created_at || ""),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { email } = body as { email?: string };

    if (email !== undefined) {
      if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
      }
      await db.execute({
        sql: "UPDATE reseller_accounts SET email = ? WHERE id = ?",
        args: [email.toLowerCase(), auth.session.userId!],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}