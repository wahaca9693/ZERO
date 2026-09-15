import { NextResponse } from "next/server";

export async function GET() {
  const key = "smm-27aaffea7977e6acb02c44875484ad6d133f5259a77de740";
  const url = `https://www.follower4.zone.id/api/v2?key=${key}&action=services`;
  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (Linux; Android 13)" },
      cache: "no-store",
    });
    const text = await res.text();
    return NextResponse.json({
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get("content-type"),
      bodyPreview: text.substring(0, 300),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
