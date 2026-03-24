import type { SkillLevel } from "./phase.js";

export interface UnpressConfig {
  wp_url: string;
  wp_auth_token: string;
  sanity_project_id: string;
  sanity_dataset: string;
  sanity_token: string;
  github_token: string;
  vercel_token: string;
  inspiration_urls: string[];
  skill_level: SkillLevel;
  session_id?: string;
}

export interface SanityConfig {
  project_id: string;
  dataset: string;
  token: string;
}

export interface MigrateOptions {
  content_types: string[];
  include_media: boolean;
  include_seo: boolean;
  batch_size: number;
  media_concurrency: number;
}

export interface DeployOptions {
  repo_name: string;
  custom_domain?: string;
}

export interface CopilotAction {
  type: "modify_component" | "add_page" | "add_section" | "update_schema" | "optimize_performance" | "adjust_responsive";
  description: string;
}

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono?: string;
  };
  spacing: {
    scale: "compact" | "normal" | "relaxed";
  };
  style: {
    borderRadius: "none" | "small" | "medium" | "large" | "full";
    vibe: "minimal" | "bold" | "corporate" | "playful" | "elegant";
  };
}
