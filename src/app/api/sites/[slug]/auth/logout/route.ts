import { NextResponse } from "next/server";
import { getIronSession } from "iron-session/edge";

const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_chars_long_for_security",
  cookieName: "reseller_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
};

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true, message: "تم تسجيل الخروج" });
  
  const session = await getIronSession(request, response, {
    password: process.env.SESSION_SECRET || "complex_password_at_least_32_chars_long_for_security",
    cookieName: "reseller_session",
    cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" }
  });
  
  session.destroy();
  
  return response;
}