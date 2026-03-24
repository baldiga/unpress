import { describe, it, expect } from "vitest";
import { generateSanitySchema } from "../schema-generator.js";
import type { Manifest } from "@unpress/shared";

describe("generateSanitySchema", () => {
  const mockManifest: Partial<Manifest> = {
    content: {
      posts: { count: 10, sample_fields: ["subtitle"], has_custom_fields: true, items: [] },
      pages: { count: 5, sample_fields: [], has_custom_fields: false, items: [] },
      custom_post_types: {
        product: { count: 20, sample_fields: ["price", "sku"], has_custom_fields: true, items: [] },
      },
    },
    wp_admin_structure: {
      sidebar_order: ["Posts", "Pages", "Products"],
      field_groups: {},
    },
  };

  it("generates schema for posts", () => {
    const schemas = generateSanitySchema(mockManifest as Manifest);
    const postSchema = schemas.find(s => s.name === "post");
    expect(postSchema).toBeDefined();
    expect(postSchema!.type).toBe("document");
  });

  it("generates schema for custom post types", () => {
    const schemas = generateSanitySchema(mockManifest as Manifest);
    const productSchema = schemas.find(s => s.name === "product");
    expect(productSchema).toBeDefined();
    expect(productSchema!.fields.some((f: any) => f.name === "price")).toBe(true);
  });

  it("generates siteSettings singleton", () => {
    const schemas = generateSanitySchema(mockManifest as Manifest);
    const settings = schemas.find(s => s.name === "siteSettings");
    expect(settings).toBeDefined();
  });

  it("generates navigation schema", () => {
    const schemas = generateSanitySchema(mockManifest as Manifest);
    const nav = schemas.find(s => s.name === "navigation");
    expect(nav).toBeDefined();
  });

  it("generates legalPage schema", () => {
    const schemas = generateSanitySchema(mockManifest as Manifest);
    const legal = schemas.find(s => s.name === "legalPage");
    expect(legal).toBeDefined();
    expect(legal!.type).toBe("document");
    expect(legal!.fields.some((f: any) => f.name === "pageType")).toBe(true);
  });
});
