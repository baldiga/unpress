export interface Manifest {
  version: "1.0";
  generated_at: string;
  wp_version: string;
  site_url: string;
  site_name: string;
  permalink_structure: string;

  content: {
    posts: ManifestContentType;
    pages: ManifestContentType;
    custom_post_types: Record<string, ManifestContentType>;
  };

  media: {
    total: number;
    items: MediaItem[];
  };

  taxonomy: {
    categories: TaxonomyItem[];
    tags: TaxonomyItem[];
    custom: Record<string, TaxonomyItem[]>;
  };

  navigation: {
    menus: Menu[];
  };

  seo: {
    plugin: "yoast" | "rankmath" | "aioseo" | "none";
    global: { title_template: string; meta_description: string };
    per_content: Record<number, SeoMeta>;
  };

  legal_pages: {
    privacy?: number;
    terms?: number;
    accessibility?: number;
    custom: { name: string; page_id: number }[];
  };

  tracking: {
    ga_id?: string;
    gtm_id?: string;
    meta_pixel_id?: string;
    custom_scripts: { location: "head" | "body"; code: string }[];
  };

  sitemap: {
    url?: string;
    entries: { loc: string; lastmod?: string; priority?: number }[];
  };

  theme: {
    name: string;
    is_block_theme: boolean;
  };

  plugins: {
    active: PluginInfo[];
    page_builder?: "elementor" | "divi" | "wpbakery" | "beaver" | "none";
  };

  acf_fields: Record<string, AcfField[]>;

  wp_admin_structure: {
    sidebar_order: string[];
    field_groups: Record<string, string[]>;
  };
}

export interface ManifestContentType {
  count: number;
  sample_fields: string[];
  has_custom_fields: boolean;
  items: ContentItem[];
}

export interface ContentItem {
  id: number;
  title: string;
  slug: string;
  status: string;
  date: string;
}

export interface MediaItem {
  id: number;
  url: string;
  mime: string;
  size: number;
  alt: string;
}

export interface TaxonomyItem {
  id: number;
  name: string;
  slug: string;
  parent?: number;
}

export interface Menu {
  name: string;
  location: string;
  items: MenuItem[];
}

export interface MenuItem {
  title: string;
  url: string;
  type: "page" | "post" | "custom" | "category";
  target_id?: number;
  children?: MenuItem[];
}

export interface SeoMeta {
  title: string;
  description: string;
  og_image?: string;
}

export interface PluginInfo {
  slug: string;
  name: string;
  version: string;
}

export interface AcfField {
  name: string;
  type: string;
  choices?: string[];
}
