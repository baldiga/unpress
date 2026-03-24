import type { SkillLevel } from "./phase.js";

export class UnpressError extends Error {
  constructor(
    message: string,
    public code: string,
    public phase: string,
    public recoverable: boolean,
    public messages: Record<SkillLevel, string>,
  ) {
    super(message);
    this.name = "UnpressError";
  }

  getMessageForLevel(level: SkillLevel): string {
    return this.messages[level];
  }
}

export class WpConnectionError extends UnpressError {
  constructor(detail: string) {
    super(
      `WordPress connection failed: ${detail}`,
      "WP_CONNECTION_FAILED",
      "scan",
      true,
      {
        novice: "We can't connect to your site's content API. This is usually because a security plugin is blocking it. Go to your WordPress admin → Settings → Permalinks, and just click 'Save Changes' (don't change anything). This often fixes it. If that doesn't work, check if you have a plugin called 'Disable REST API' and deactivate it temporarily.",
        medium: "WP REST API is blocked. Check permalinks settings or disable 'Disable REST API' plugin.",
        expert: `REST API connection failed: ${detail}. Check permalink structure and REST API access.`,
      },
    );
  }
}

export class SanityWriteError extends UnpressError {
  constructor(detail: string) {
    super(
      `Sanity write failed: ${detail}`,
      "SANITY_WRITE_FAILED",
      "migrate",
      true,
      {
        novice: "We had trouble saving some content to your new site's database. This usually fixes itself — we'll retry automatically. If it keeps happening, check that your Sanity API token has write permissions.",
        medium: "Sanity mutation failed. Check API token permissions. Retrying...",
        expert: `Sanity write error: ${detail}`,
      },
    );
  }
}

export class MediaDownloadError extends UnpressError {
  constructor(url: string, detail: string) {
    super(
      `Media download failed: ${url} — ${detail}`,
      "MEDIA_DOWNLOAD_FAILED",
      "migrate",
      true,
      {
        novice: `We couldn't download one of your images (${url}). It might be temporarily unavailable. We'll skip it for now and you can add it manually later in Sanity.`,
        medium: `Media download failed for ${url}. Skipping — add manually in Sanity after migration.`,
        expert: `Media download failed: ${url} — ${detail}`,
      },
    );
  }
}

export class DeployError extends UnpressError {
  constructor(detail: string) {
    super(
      `Deployment failed: ${detail}`,
      "DEPLOY_FAILED",
      "deploy",
      true,
      {
        novice: "The deployment didn't work on the first try. This can happen if there's a temporary issue with Vercel. Let's try again — and if it still fails, I'll show you the error details so we can fix it together.",
        medium: `Vercel deployment failed: ${detail}. Check build logs.`,
        expert: `Deploy error: ${detail}`,
      },
    );
  }
}
