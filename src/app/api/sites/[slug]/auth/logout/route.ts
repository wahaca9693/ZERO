import { NextResponse } from "next/server";
import { sessionOptions, type SessionUser } from "@/lib/session";
import { getIronSession } from "iron-session";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  const session = await getIronSession<SessionUser>(request, response, sessionOptions);
  session.destroy();
  return response;
}