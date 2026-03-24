import { describe, it, expect } from "vitest";
import { generateRedirectMap, redirectsToNextConfig } from "../redirect-map.js";
import type { Manifest } from "@unpress/shared";

describe("generateRedirectMap", () => {
  const mockManifest: Partial<Manifest> = {
    site_url: "https://example.com",
    content: {
      posts: {
        count: 2,
        sample_fields: [],
        has_custom_fields: false,
        items: [
          { id: 1, title: "Hello World", slug: "hello-world", status: "publish", date: "2024-03-15T10:00:00Z" },
          { id: 2, title: "Second Post", slug: "second-post", status: "publish", date: "2024-06-20T10:00:00Z" },
        ],
      },
      pages: {
        count: 1,
        sample_fields: [],
        has_custom_fields: false,
        items: [
          { id: 3, title: "About", slug: "about", status: "publish", date: "2024-01-01T10:00:00Z" },
        ],
      },
      custom_post_types: {},
    },
    taxonomy: {
      categories: [{ id: 1, name: "Recipes", slug: "recipes" }],
      tags: [{ id: 1, name: "Easy", slug: "easy" }],
      custom: {},
    },
  };

  it("generates redirects for posts with date-based permalinks", () => {
    const redirects = generateRedirectMap(mockManifest as Manifest, "/%year%/%monthnum%/%postname%/");
    const helloRedirect = redirects.find(r => r.destination === "/blog/hello-world");
    expect(helloRedirect).toBeDefined();
    expect(helloRedirect!.source).toBe("/2024/03/hello-world/");
    expect(helloRedirect!.permanent).toBe(true);
  });

  it("generates redirects for plain permalink structure", () => {
    const redirects = generateRedirectMap(mockManifest as Manifest, "/%postname%/");
    const helloRedirect = redirects.find(r => r.destination === "/blog/hello-world" && !r.source.includes("?"));
    expect(helloRedirect).toBeDefined();
    expect(helloRedirect!.source).toBe("/hello-world/");
  });

  it("generates query param fallback redirects", () => {
    const redirects = generateRedirectMap(mockManifest as Manifest, "/%postname%/");
    const queryRedirect = redirects.find(r => r.source.includes("p=1"));
    expect(queryRedirect).toBeDefined();
    expect(queryRedirect!.destination).toBe("/blog/hello-world");
  });

  it("generates category archive redirects", () => {
    const redirects = generateRedirectMap(mockManifest as Manifest, "/%postname%/");
    const catRedirect = redirects.find(r => r.source === "/category/recipes/");
    expect(catRedirect).toBeDefined();
    expect(catRedirect!.destination).toBe("/category/recipes");
  });

  it("preserves page slugs", () => {
    const redirects = generateRedirectMap(mockManifest as Manifest, "/%postname%/");
    const wrongRedirect = redirects.find(r => r.source === "/about" && r.destination !== "/about");
    expect(wrongRedirect).toBeUndefined();
  });
});

describe("redirectsToNextConfig", () => {
  it("generates valid Next.js redirects config string", () => {
    const redirects = [
      { source: "/old-path/", destination: "/new-path", permanent: true },
    ];
    const config = redirectsToNextConfig(redirects);
    expect(config).toContain("source: '/old-path/'");
    expect(config).toContain("destination: '/new-path'");
    expect(config).toContain("permanent: true");
  });
});
