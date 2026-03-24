import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { project_id, dataset, token } = await req.json();

    if (!project_id || !token) {
      return NextResponse.json({ ok: false, error: "Project ID and token are required" }, { status: 400 });
    }

    const ds = dataset || "production";
    const res = await fetch(
      `https://${project_id}.api.sanity.io/v2024-01-01/data/query/${ds}?query=*[_type == "sanity.imageAsset"][0]`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      const status = res.status;
      if (status === 401) return NextResponse.json({ ok: false, error: "Invalid token. Make sure you copied the full token." });
      if (status === 404) return NextResponse.json({ ok: false, error: "Project not found. Check your Project ID." });
      return NextResponse.json({ ok: false, error: `Sanity returned ${status}.` });
    }

    return NextResponse.json({ ok: true, data: { project_id, dataset: ds } });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not connect to Sanity." }, { status: 500 });
  }
}
