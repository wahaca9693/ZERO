import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const result = await db.execute({
      sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name='branch_providers'",
    });
    const createSql = String((result.rows[0] as unknown as Record<string, unknown> | undefined)?.sql || "");
    const url = (process.env.TURSO_DATABASE_URL || "").replace(/^(libsql|https):\/\/([^:]+):([^@]+)@/, "$1://$2:***@");
    return NextResponse.json({
      db_url: url,
      has_unique: createSql.includes("UNIQUE"),
      create_sql_preview: createSql.substring(0, 200),
      has_old_table: undefined,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}