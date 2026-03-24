export { WpClient } from "./wp-client.js";
export { calculateCosts } from "./cost-calculator.js";
export type { CostEstimate } from "./cost-calculator.js";

import type { Phase, PhaseContext, PhaseEvent, Manifest } from "@unpress/shared";
import type { CostEstimate } from "./cost-calculator.js";
import { WpClient } from "./wp-client.js";
import { calculateCosts } from "./cost-calculator.js";

export interface ScanInput {
  wp_url: string;
  wp_auth_token: string;
}

export interface ScanOutput {
  manifest: Manifest;
  costs: CostEstimate;
}

export const scanPhase: Phase<ScanInput, ScanOutput> = {
  name: "scan",
  async *run(input: ScanInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, ScanOutput> {
    yield { type: "progress", percent: 0, message: "Connecting to WordPress..." };

    const client = new WpClient(input.wp_url, input.wp_auth_token);
    await client.checkHealth();

    yield { type: "progress", percent: 30, message: "Scanning content..." };

    const manifest = await client.fetchManifest();

    yield { type: "progress", percent: 80, message: "Calculating costs..." };

    const costs = calculateCosts({
      posts: manifest.content.posts.count,
      pages: manifest.content.pages.count,
      media: manifest.media.total,
    });

    yield { type: "progress", percent: 100, message: "Scan complete" };

    return { manifest, costs };
  },
};
