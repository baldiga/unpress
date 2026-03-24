import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token is required" }, { status: 400 });
    }

    const res = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) return NextResponse.json({ ok: false, error: "Invalid token. Make sure you copied the full token." });
      return NextResponse.json({ ok: false, error: `Vercel returned ${res.status}.` });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, data: { username: data.user?.username || data.user?.name || "connected" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not connect to Vercel." }, { status: 500 });
  }
}
