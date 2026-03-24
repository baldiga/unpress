import type { Phase, PhaseContext, PhaseEvent, DesignTokens, Manifest, SanityConfig } from "@unpress/shared";

export async function analyzeInspirationSites(urls: string[]): Promise<DesignTokens> {
  // TODO: Playwright screenshots + Claude analysis
  return {
    colors: { primary: "#D4603A", secondary: "#1a1a1a", accent: "#6366f1", background: "#F5F0EB", foreground: "#1a1a1a", muted: "#6b6058" },
    fonts: { heading: "Inter", body: "Inter" },
    spacing: { scale: "normal" },
    style: { borderRadius: "medium", vibe: "elegant" },
  };
}

export async function generateSite(tokens: DesignTokens, manifest: Manifest, sanityConfig: SanityConfig): Promise<string> {
  // TODO: Generate Next.js site using 21st.dev + shadcn
  return "http://localhost:3001";
}

export interface DesignInput {
  inspiration_urls: string[];
  manifest: Manifest;
  sanity_config: SanityConfig;
}

export interface DesignOutput {
  design_tokens: DesignTokens;
  preview_url: string;
}

export const designPhase: Phase<DesignInput, DesignOutput> = {
  name: "design",
  async *run(input: DesignInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, DesignOutput> {
    yield { type: "progress", percent: 0, message: "Analyzing inspiration sites..." };
    const tokens = await analyzeInspirationSites(input.inspiration_urls);
    yield { type: "progress", percent: 50, message: "Generating site..." };
    const previewUrl = await generateSite(tokens, input.manifest, input.sanity_config);
    yield { type: "progress", percent: 100, message: "Design complete" };
    return { design_tokens: tokens, preview_url: previewUrl };
  },
};
