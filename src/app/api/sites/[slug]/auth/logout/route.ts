import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionOptions, siteSessionOptions, type SessionUser } from "@/lib/session";
import { getIronSession } from "iron-session";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const session = await getIronSession<SessionUser>(cookieStore, siteSessionOptions(slug));
  session.destroy();
  return NextResponse.json({ success: true });
}