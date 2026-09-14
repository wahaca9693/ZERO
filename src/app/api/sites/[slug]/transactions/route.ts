import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireSiteAuth } from "@/lib/session";

type Row = Record<string, unknown>;

/**
 * GET /api/sites/{slug}/transactions
 * Full transaction history for the reseller account.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    const result = await db.execute({
      sql: "SELECT id, type, amount, status, description, method, created_at FROM reseller_transactions WHERE account_id = ? ORDER BY created_at DESC LIMIT 200",
      args: [auth.session.userId!],
    });

    const transactions = result.rows.map((row) => {
      const item = row as Row;
      return {
        id: Number(item.id),
        type: String(item.type),
        amount: Number(item.amount),
        status: String(item.status),
        description: item.description ? String(item.description) : "",
        method: item.method ? String(item.method) : "",
        created_at: String(item.created_at),
      };
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("[site-transactions]", error);
    return NextResponse.json({ error: "تعذر تحميل المعاملات" }, { status: 500 });
  }
}