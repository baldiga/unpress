import type { Manifest, SanityConfig, MigrateOptions } from "@unpress/shared";

export class ContentMigrator {
  private projectId: string;
  private dataset: string;
  private token: string;

  constructor(config: SanityConfig) {
    this.projectId = config.project_id;
    this.dataset = config.dataset;
    this.token = config.token;
  }

  async migrateAll(manifest: Manifest, options: MigrateOptions): Promise<number> {
    let totalCreated = 0;

    for (const contentType of options.content_types) {
      const source = contentType === "post"
        ? manifest.content.posts
        : contentType === "page"
        ? manifest.content.pages
        : manifest.content.custom_post_types[contentType];

      if (!source) continue;

      const batches = this.chunk(source.items, options.batch_size);
      for (const batch of batches) {
        const mutations = batch.map((item) => ({
          create: {
            _type: contentType,
            title: item.title,
            slug: { _type: "slug", current: item.slug },
            publishedAt: item.date,
          },
        }));

        await this.mutate(mutations);
        totalCreated += batch.length;
      }
    }

    return totalCreated;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  private async mutate(mutations: unknown[]): Promise<void> {
    const url = `https://${this.projectId}.api.sanity.io/v2024-01-01/data/mutate/${this.dataset}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ mutations }),
    });

    if (!res.ok) {
      throw new Error(`Sanity mutation failed: ${res.status} ${await res.text()}`);
    }
  }
}
