import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const result = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%branch%'",
    });
    const tables = (result.rows as unknown as Array<{ name: string }>).map((r) => r.name);
    const cols = await db.execute({
      sql: "PRAGMA table_info(branch_providers)",
    });
    const columns = (cols.rows as unknown as Array<{ name: string }>).map((r) => r.name);
    return NextResponse.json({ tables, columns });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}