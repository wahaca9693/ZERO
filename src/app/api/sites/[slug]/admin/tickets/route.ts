import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    const auth = await requireResellerAdmin(slug);
    const siteId = Number(auth.account.site_id);

    const result = await db.execute({
      sql: `SELECT t.id, t.subject, t.message, t.status, t.priority, t.created_at,
                   a.username AS account_username
            FROM reseller_tickets t
            LEFT JOIN reseller_accounts a ON a.id = t.account_id
            WHERE t.site_id = ?
            ORDER BY t.created_at DESC LIMIT 100`,
      args: [siteId],
    });
    const tickets = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id),
        subject: String(r.subject || ""),
        message: r.message ? String(r.message) : "",
        status: String(r.status || "open"),
        priority: String(r.priority || "normal"),
        createdAt: r.created_at ? String(r.created_at) : "",
        username: r.account_username ? String(r.account_username) : "",
      };
    });
    return NextResponse.json({ tickets });
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
    const { ticketId, status, reply } = body as { ticketId?: number; status?: string; reply?: string };

    if (ticketId) {
      if (status) {
        await db.execute({
          sql: "UPDATE reseller_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND site_id = ?",
          args: [status, ticketId, siteId],
        });
      }
      if (reply) {
        await db.execute({
          sql: "INSERT INTO reseller_ticket_replies (ticket_id, account_id, message) VALUES (?, ?, ?)",
          args: [ticketId, auth.account.id, reply],
        });
        await db.execute({
          sql: "UPDATE reseller_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND site_id = ?",
          args: [ticketId, siteId],
        });
      }
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "ticketId مطلوب" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
