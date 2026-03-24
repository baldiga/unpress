import type { SanityConfig } from "@unpress/shared";

interface MediaItem {
  id: number;
  url: string;
  mime: string;
  alt: string;
}

export class MediaMigrator {
  private projectId: string;
  private dataset: string;
  private token: string;

  constructor(config: SanityConfig) {
    this.projectId = config.project_id;
    this.dataset = config.dataset;
    this.token = config.token;
  }

  async uploadAll(items: MediaItem[], concurrency: number): Promise<number> {
    let uploaded = 0;

    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((item) => this.uploadOne(item)),
      );

      for (const result of results) {
        if (result.status === "fulfilled") uploaded++;
      }
    }

    return uploaded;
  }

  private async uploadOne(item: MediaItem): Promise<string> {
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`Failed to download ${item.url}: ${res.status}`);
    const buffer = await res.arrayBuffer();

    const filename = item.url.split("/").pop() || "media";
    const assetType = item.mime.startsWith("image/") ? "images" : "files";
    const uploadUrl = `https://${this.projectId}.api.sanity.io/v2024-01-01/assets/${assetType}/${this.dataset}?filename=${encodeURIComponent(filename)}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": item.mime,
        Authorization: `Bearer ${this.token}`,
      },
      body: buffer,
    });

    if (!uploadRes.ok) throw new Error(`Sanity upload failed: ${uploadRes.status}`);

    const data = await uploadRes.json() as { document: { _id: string } };
    return data.document._id;
  }
}
