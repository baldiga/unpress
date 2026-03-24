import type { Manifest } from "@unpress/shared";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface Redirect {
  source: string;
  destination: string;
  permanent: boolean;
}

export function generateRedirectMap(manifest: Manifest, wpPermalinkStructure: string): Redirect[] {
  const redirects: Redirect[] = [];

  for (const post of manifest.content.posts.items) {
    const oldPath = resolveWpPermalink(wpPermalinkStructure, post);
    const newPath = `/blog/${post.slug}`;

    if (oldPath !== newPath) {
      redirects.push({ source: oldPath, destination: newPath, permanent: true });
    }

    redirects.push({ source: `/?p=${post.id}`, destination: newPath, permanent: true });
  }

  for (const page of manifest.content.pages.items) {
    const oldPath = `/${page.slug}/`;
    const newPath = `/${page.slug}`;

    if (oldPath !== newPath) {
      redirects.push({ source: oldPath, destination: newPath, permanent: true });
    }

    redirects.push({ source: `/?page_id=${page.id}`, destination: newPath, permanent: true });
  }

  for (const [typeName, typeData] of Object.entries(manifest.content.custom_post_types)) {
    for (const item of typeData.items) {
      redirects.push({ source: `/${typeName}/${item.slug}/`, destination: `/${typeName}/${item.slug}`, permanent: true });
      redirects.push({ source: `/?p=${item.id}`, destination: `/${typeName}/${item.slug}`, permanent: true });
    }
  }

  for (const cat of manifest.taxonomy.categories) {
    redirects.push({ source: `/category/${cat.slug}/`, destination: `/category/${cat.slug}`, permanent: true });
  }

  for (const tag of manifest.taxonomy.tags) {
    redirects.push({ source: `/tag/${tag.slug}/`, destination: `/tag/${tag.slug}`, permanent: true });
  }

  return redirects;
}

function resolveWpPermalink(structure: string, post: { slug: string; date: string }): string {
  const date = new Date(post.date);
  return structure
    .replace("%year%", date.getUTCFullYear().toString())
    .replace("%monthnum%", String(date.getUTCMonth() + 1).padStart(2, "0"))
    .replace("%day%", String(date.getUTCDate()).padStart(2, "0"))
    .replace("%postname%", post.slug);
}

export function redirectsToNextConfig(redirects: Redirect[]): string {
  const entries = redirects.map(r =>
    `      { source: ${JSON.stringify(r.source)}, destination: ${JSON.stringify(r.destination)}, permanent: ${r.permanent} },`
  ).join("\n");

  return `  async redirects() {\n    return [\n${entries}\n    ];\n  },`;
}

export async function saveRedirectMap(
  redirects: Redirect[],
  baseDir: string,
  sessionId: string,
): Promise<string> {
  const dir = join(baseDir, ".unpress", "redirects");
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${sessionId}.json`);
  await writeFile(filePath, JSON.stringify(redirects, null, 2));
  return filePath;
}
