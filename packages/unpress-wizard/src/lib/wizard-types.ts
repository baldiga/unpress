export type SkillLevel = "novice" | "medium" | "expert";

export interface WizardState {
  level: SkillLevel;
  currentStep: number;
  completedSteps: number[];
  wp_url?: string;
  wp_auth_token?: string;
  wp_verified?: boolean;
  wp_manifest_summary?: {
    posts: number;
    pages: number;
    media: number;
    plugins: string[];
  };
  sanity_project_id?: string;
  sanity_dataset?: string;
  sanity_token?: string;
  sanity_verified?: boolean;
  github_token?: string;
  github_username?: string;
  github_verified?: boolean;
  vercel_token?: string;
  vercel_username?: string;
  vercel_verified?: boolean;
  inspiration_urls?: string[];
}

export const INITIAL_STATE: WizardState = {
  level: "novice",
  currentStep: 1,
  completedSteps: [],
};

export interface StepMeta {
  number: number;
  title: string;
  description: string;
  estimatedTime: string;
}

export const STEPS: StepMeta[] = [
  { number: 1, title: "Install WP Plugin", description: "Download and activate the Unpress plugin", estimatedTime: "2–3 min" },
  { number: 2, title: "Connect WordPress", description: "Verify your site connection with an auth token", estimatedTime: "1–2 min" },
  { number: 3, title: "Set Up Sanity", description: "Create your new content management system", estimatedTime: "3–5 min" },
  { number: 4, title: "Set Up GitHub", description: "Connect a code repository for your site", estimatedTime: "2–3 min" },
  { number: 5, title: "Set Up Vercel", description: "Connect your hosting platform", estimatedTime: "2–3 min" },
  { number: 6, title: "Design Inspiration", description: "Share websites you love", estimatedTime: "2 min" },
  { number: 7, title: "Review & Launch", description: "Confirm everything and start migration", estimatedTime: "1 min" },
];

export const LEVEL_META: Record<SkillLevel, { icon: string; label: string; color: string }> = {
  novice: { icon: "🌱", label: "Novice", color: "#22c55e" },
  medium: { icon: "⚡", label: "Medium", color: "#f59e0b" },
  expert: { icon: "🚀", label: "Expert", color: "#ef4444" },
};
