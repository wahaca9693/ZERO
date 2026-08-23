import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store, max-age=0", ...(init?.headers || {}) },
  });
}

export async function GET() {
  const publicProjectId = String(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
  const serverProjectId = String(process.env.FIREBASE_PROJECT_ID || publicProjectId).trim();
  const firebaseConfigured = Boolean(
    publicProjectId &&
    serverProjectId &&
    publicProjectId === serverProjectId &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  );
  const turnstileRequired = process.env.TURNSTILE_REQUIRED === "1" || process.env.NODE_ENV === "production";
  const turnstileConfigured = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
    process.env.TURNSTILE_SECRET_KEY,
  );

  return json({
    firebaseConfigured,
    turnstileConfigured,
    turnstileRequired,
    registrationReady: firebaseConfigured && (!turnstileRequired || turnstileConfigured),
  });
}
