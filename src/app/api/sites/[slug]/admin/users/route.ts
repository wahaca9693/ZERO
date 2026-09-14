import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let sql = "SELECT id, username, email, balance, role, is_banned, created_at FROM reseller_accounts WHERE site_id = ?";
    const args: Array<string | number> = [siteId];
    if (search) {
      sql += " AND (username LIKE ? OR email LIKE ?)";
      args.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY created_at DESC LIMIT 100";

    const result = await db.execute({ sql, args });
    const users = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: Number(r.id),
        username: String(r.username || ""),
        email: r.email ? String(r.email) : "",
        balance: Number(r.balance || 0),
        role: String(r.role || "user"),
        is_banned: Number(r.is_banned || 0),
        created_at: String(r.created_at || ""),
      };
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    const body = await request.json();
    const { userId, action, amount, reason } = body as {
      userId?: number;
      action?: "add" | "deduct" | "ban" | "unban";
      amount?: number;
      reason?: string;
    };

    if (!userId || typeof userId !== "number") {
      return NextResponse.json({ error: "userId مطلوب" }, { status: 400 });
    }

    // Verify the target user belongs to this site
    const target = await db.execute({
      sql: "SELECT id, balance, site_id FROM reseller_accounts WHERE id = ? AND site_id = ?",
      args: [userId, siteId],
    });
    if (!target.rows[0]) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    if (action === "add" || action === "deduct") {
      const value = Number(amount || 0);
      if (value <= 0) return NextResponse.json({ error: "المبلغ غير صالح" }, { status: 400 });
      const delta = action === "add" ? value : -value;
      await db.execute({
        sql: "UPDATE reseller_accounts SET balance = balance + ? WHERE id = ? AND site_id = ?",
        args: [delta, userId, siteId],
      });
      await db.execute({
        sql: "INSERT INTO reseller_transactions (account_id, site_id, type, amount, status, description) VALUES (?, ?, ?, ?, 'completed', ?)",
        args: [userId, siteId, action === "add" ? "deposit" : "withdraw", value, reason || `تعديل رصيد من الأدمن (${action})`],
      });
      return NextResponse.json({ success: true });
    }

    if (action === "ban" || action === "unban") {
      await db.execute({
        sql: "UPDATE reseller_accounts SET is_banned = ? WHERE id = ? AND site_id = ?",
        args: [action === "ban" ? 1 : 0, userId, siteId],
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}