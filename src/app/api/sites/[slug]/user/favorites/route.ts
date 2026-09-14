import { NextResponse } from "next/server";
import { requireSiteAuth } from "@/lib/session";

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/sites/{slug}/user/favorites
 * Returns favorite services for the logged-in reseller account.
 * Simplified for branch: returns empty list (can be extended with a reseller_favorites table).
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    // TODO: Create reseller_user_favorites table for per-account favorites
    // For now, return empty favorites list so the services page renders correctly
    return NextResponse.json({ favoriteServiceIds: [] });
  } catch {
    return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
  }
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    return NextResponse.json({ success: true, favorite: true });
  } catch {
    return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const auth = await requireSiteAuth(slug);
    if (!auth.ok) return auth.response;

    return NextResponse.json({ success: true, favorite: false });
  } catch {
    return NextResponse.json({ error: "يرجى تسجيل الدخول" }, { status: 401 });
  }
}