import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionOptions, type SessionUser } from "@/lib/session";
import { getIronSession } from "iron-session";

export async function POST() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionUser>(cookieStore, sessionOptions);
  session.destroy();
  return NextResponse.json({ success: true });
}