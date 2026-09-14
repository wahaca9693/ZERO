import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireResellerAdmin } from "@/lib/reseller-auth";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    await initDb();
    await requireResellerAdmin(slug);
    // Read the shared service catalog (same as main platform)
    const result = await db.execute({
      sql: `SELECT p.id, p.name, p.status,
                   (SELECT COUNT(*) FROM provider_services ps WHERE ps.provider_id = p.id) AS services_count
            FROM providers p ORDER BY p.id ASC LIMIT 100`,
    });
    const providers = result.rows.map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: Number(r.id), name: String(r.name || ""), status: String(r.status || "active"),
        servicesCount: Number(r.services_count || 0),
      };
    });
    return NextResponse.json({ providers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }
}
