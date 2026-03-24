import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url, token } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "URL is required" }, { status: 400 });
    }

    const baseUrl = url.replace(/\/+$/, "");

    if (token) {
      // Full manifest verification
      const authHeader = "Basic " + Buffer.from(token).toString("base64");
      const res = await fetch(`${baseUrl}/wp-json/unpress/v1/manifest`, {
        headers: { Authorization: authHeader },
      });

      if (!res.ok) {
        const status = res.status;
        if (status === 403) {
          return NextResponse.json({ ok: false, error: "Plugin not verified — check the consent checkbox in WP Admin → Unpress" });
        }
        return NextResponse.json({ ok: false, error: `WordPress returned ${status}. Check your auth token.` });
      }

      const manifest = await res.json();
      return NextResponse.json({
        ok: true,
        data: {
          wp_version: manifest.wp_version,
          posts: manifest.content?.posts?.count ?? 0,
          pages: manifest.content?.pages?.count ?? 0,
          media: manifest.media?.total ?? 0,
          plugins: manifest.plugins?.active?.map((p: { name: string }) => p.name) ?? [],
        },
      });
    } else {
      // Health check only
      const res = await fetch(`${baseUrl}/wp-json/unpress/v1/health`);

      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `Health check failed (${res.status}). Is the plugin installed and activated?` });
      }

      const data = await res.json();
      return NextResponse.json({
        ok: true,
        data: { wp_version: data.wp_version, status: data.status },
      });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Could not connect. Check the URL and try again." }, { status: 500 });
  }
}
