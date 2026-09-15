import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "smm-27aaffea7977e6acb02c44875484ad6d133f5259a77de740";
  const endpoint = `https://www.follower4.zone.id/api/v2?key=${key}&action=services`;
  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (Linux; Android 13)" },
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch {}
    return NextResponse.json({
      status: res.status,
      isArray: Array.isArray(parsed),
      isObject: !!parsed && typeof parsed === "object" && !Array.isArray(parsed),
      keys: parsed && typeof parsed === "object" ? Object.keys(parsed as Record<string, unknown>).slice(0, 10) : [],
      bodyPreview: text.substring(0, 400),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}