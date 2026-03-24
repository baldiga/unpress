import type { Manifest } from "@unpress/shared";

interface SanitySchemaField {
  name: string;
  title: string;
  type: string;
  [key: string]: unknown;
}

interface SanitySchema {
  name: string;
  title: string;
  type: string;
  fields: SanitySchemaField[];
}

export function generateSanitySchema(manifest: Manifest): SanitySchema[] {
  const schemas: SanitySchema[] = [];

  // Site Settings singleton
  schemas.push({
    name: "siteSettings",
    title: "Site Settings",
    type: "document",
    fields: [
      { name: "title", title: "Site Title", type: "string" },
      { name: "tagline", title: "Tagline", type: "string" },
      { name: "logo", title: "Logo", type: "image" },
      { name: "footerText", title: "Footer Text", type: "text" },
      { name: "gaId", title: "Google Analytics ID", type: "string" },
      { name: "gtmId", title: "Google Tag Manager ID", type: "string" },
      { name: "metaPixelId", title: "Meta Pixel ID", type: "string" },
      { name: "customScripts", title: "Custom Scripts", type: "array", of: [{ type: "object", fields: [
        { name: "location", title: "Location", type: "string" },
        { name: "code", title: "Code", type: "text" },
      ]}] },
    ],
  });

  // Navigation
  schemas.push({
    name: "navigation",
    title: "Navigation",
    type: "document",
    fields: [
      { name: "name", title: "Menu Name", type: "string" },
      { name: "location", title: "Location", type: "string" },
      { name: "items", title: "Menu Items", type: "array", of: [{ type: "menuItem" }] },
    ],
  });

  // Legal pages
  schemas.push({
    name: "legalPage",
    title: "Legal Page",
    type: "document",
    fields: [
      { name: "title", title: "Title", type: "string" },
      { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
      { name: "body", title: "Body", type: "blockContent" },
      { name: "pageType", title: "Type", type: "string", options: { list: ["privacy", "terms", "cookie", "disclaimer", "other"] } },
    ],
  });

  // Posts
  schemas.push(generateContentTypeSchema("post", "Post", manifest.content.posts));

  // Pages
  schemas.push(generateContentTypeSchema("page", "Page", manifest.content.pages));

  // Custom post types
  for (const [typeName, typeData] of Object.entries(manifest.content.custom_post_types)) {
    const title = typeName.charAt(0).toUpperCase() + typeName.slice(1);
    schemas.push(generateContentTypeSchema(typeName, title, typeData));
  }

  return schemas;
}

function generateContentTypeSchema(
  name: string,
  title: string,
  contentType: Manifest["content"]["posts"],
): SanitySchema {
  const fields: SanitySchemaField[] = [
    { name: "title", title: "Title", type: "string" },
    { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
    { name: "body", title: "Body", type: "blockContent" },
    { name: "featuredImage", title: "Featured Image", type: "image" },
    { name: "publishedAt", title: "Published At", type: "datetime" },
    { name: "seoTitle", title: "SEO Title", type: "string", group: "seo" },
    { name: "seoDescription", title: "SEO Description", type: "text", group: "seo" },
    { name: "ogImage", title: "OG Image", type: "image", group: "seo" },
  ];

  for (const fieldName of contentType.sample_fields) {
    if (!fields.some(f => f.name === fieldName)) {
      fields.push({
        name: fieldName,
        title: fieldName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        type: "string",
      });
    }
  }

  return { name, title, type: "document", fields };
}
