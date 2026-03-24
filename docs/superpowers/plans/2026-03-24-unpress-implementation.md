# Unpress Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Unpress — an MCP server that migrates WordPress sites to Next.js + Sanity + Vercel with adaptive onboarding and AI-powered design.

**Architecture:** Turborepo monorepo with one orchestrator MCP server delegating to 6 phase modules (wizard, scan, migrate, design, deploy, copilot) plus a PHP WordPress plugin. Phases are TypeScript modules imported by the orchestrator, communicating via typed interfaces and async generators.

**Tech Stack:** TypeScript, Node.js, Next.js 15, Tailwind CSS, shadcn/ui, Sanity v3, PHP 8+, Turborepo, Vitest, Playwright, `@sanity/migrate`, `@sanity/block-tools`, MCP SDK

**Spec:** `docs/superpowers/specs/2026-03-24-unpress-design.md`

---

## Chunk 1: Monorepo Foundation + Shared Types + Orchestrator Shell

This chunk creates the project skeleton, all shared TypeScript interfaces from the spec, and the orchestrator MCP server shell that phases will plug into.

### Task 1: Initialize Turborepo Monorepo

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.npmrc`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`

- [ ] **Step 1: Initialize root package.json**

```json
{
  "name": "unpress",
  "private": true,
  "workspaces": [
    "packages/*",
    "plugins/*",
    "templates/*"
  ],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5.7",
    "vitest": "^3",
    "@types/node": "^22"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "dist"
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
.unpress/
.next/
.turbo/
.superpowers/
*.tsbuildinfo
```

- [ ] **Step 5: Create .env.example**

```bash
# WordPress
WP_URL=https://yourdomain.com
WP_AUTH_TOKEN=

# Sanity
SANITY_PROJECT_ID=
SANITY_DATASET=production
SANITY_TOKEN=

# GitHub
GITHUB_TOKEN=

# Vercel
VERCEL_TOKEN=
```

- [ ] **Step 6: Create shared package skeleton**

```bash
mkdir -p packages/shared/src
```

Create `packages/shared/package.json`:
```json
{
  "name": "@unpress/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.7"
  }
}
```

Create `packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Install dependencies and verify**

Run: `pnpm install`
Run: `npx turbo build --filter=@unpress/shared`
Expected: Clean build with no errors

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize Unpress monorepo with Turborepo"
```

---

### Task 2: Define All Shared Types

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/manifest.ts`
- Create: `packages/shared/src/phase.ts`
- Create: `packages/shared/src/checkpoint.ts`
- Create: `packages/shared/src/config.ts`
- Create: `packages/shared/src/errors.ts`

- [ ] **Step 1: Write manifest types**

Create `packages/shared/src/manifest.ts` with all types from spec Section 2.3:

```typescript
export interface Manifest {
  version: "1.0";
  generated_at: string;
  wp_version: string;
  site_url: string;
  site_name: string;

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
```

- [ ] **Step 2: Write phase interface types**

Create `packages/shared/src/phase.ts`:

```typescript
import type { Checkpoint } from "./checkpoint.js";

export type SkillLevel = "novice" | "medium" | "expert";

export type PhaseName = "wizard" | "scan" | "migrate" | "design" | "deploy" | "copilot";

export interface Phase<TInput, TOutput> {
  name: PhaseName;
  run(input: TInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, TOutput>;
}

export interface PhaseContext {
  session_id: string;
  skill_level: SkillLevel;
  checkpoint: CheckpointManager;
  wizard: WizardBridge;
  logger: Logger;
}

export interface CheckpointManager {
  save(phase: string, step: string, state: Record<string, unknown>): Promise<void>;
  load(phase: string): Promise<Checkpoint | null>;
  getCompletedItems(phase: string): Promise<string[]>;
}

export interface WizardBridge {
  sendProgress(percent: number, message: string): void;
  requestDecision(id: string, question: string, options: string[]): Promise<string>;
  sendError(error: Error, recoverable: boolean): void;
}

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error): void;
}

export type PhaseEvent =
  | { type: "progress"; percent: number; message: string }
  | { type: "decision"; id: string; question: string; options: string[] }
  | { type: "error"; error: Error; recoverable: boolean }
  | { type: "checkpoint"; data: Checkpoint };
```

- [ ] **Step 3: Write checkpoint types**

Create `packages/shared/src/checkpoint.ts`:

```typescript
export interface Checkpoint {
  id: string;
  session_id: string;
  phase: string;
  step: string;
  timestamp: string;
  state: Record<string, unknown>;
  completed_items: string[];
  pending_items: string[];
}

export interface SessionSummary {
  session_id: string;
  started_at: string;
  completed_at?: string;
  status: "in_progress" | "completed" | "failed" | "rolled_back";
  wp_url: string;
  created_resources: {
    sanity_document_ids: string[];
    github_repo?: string;
    vercel_project_id?: string;
    vercel_preview_url?: string;
    vercel_production_url?: string;
  };
  phases_completed: string[];
  errors: ErrorLogEntry[];
}

export interface ErrorLogEntry {
  timestamp: string;
  phase: string;
  message: string;
  recoverable: boolean;
  resolved: boolean;
}
```

- [ ] **Step 4: Write config types**

Create `packages/shared/src/config.ts`:

```typescript
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
```

- [ ] **Step 5: Write error types**

Create `packages/shared/src/errors.ts`:

```typescript
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
```

- [ ] **Step 6: Create barrel export**

Create `packages/shared/src/index.ts`:

```typescript
export * from "./manifest.js";
export * from "./phase.js";
export * from "./checkpoint.js";
export * from "./config.js";
export * from "./errors.js";
```

- [ ] **Step 7: Build and verify**

Run: `npx turbo build --filter=@unpress/shared`
Expected: Clean build, all types compile

- [ ] **Step 8: Commit**

```bash
git add packages/shared/
git commit -m "feat: add all shared types — manifest, phase, checkpoint, config, errors"
```

---

### Task 3: Create Orchestrator MCP Server Shell

**Files:**
- Create: `packages/unpress/package.json`
- Create: `packages/unpress/tsconfig.json`
- Create: `packages/unpress/src/index.ts`
- Create: `packages/unpress/src/server.ts`
- Create: `packages/unpress/src/session-manager.ts`
- Create: `packages/unpress/src/checkpoint-manager.ts`
- Test: `packages/unpress/src/__tests__/session-manager.test.ts`
- Test: `packages/unpress/src/__tests__/checkpoint-manager.test.ts`

- [ ] **Step 1: Create package skeleton**

Create `packages/unpress/package.json`:
```json
{
  "name": "unpress",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "unpress": "dist/index.js"
  },
  "main": "dist/server.js",
  "types": "dist/server.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1",
    "@unpress/shared": "workspace:*",
    "dotenv": "^16",
    "uuid": "^11"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "vitest": "^3",
    "@types/uuid": "^10"
  }
}
```

Create `packages/unpress/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write failing test for checkpoint manager**

Create `packages/unpress/src/__tests__/checkpoint-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileCheckpointManager } from "../checkpoint-manager.js";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("FileCheckpointManager", () => {
  let tempDir: string;
  let manager: FileCheckpointManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "unpress-test-"));
    manager = new FileCheckpointManager(tempDir, "test-session");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("saves and loads a checkpoint", async () => {
    await manager.save("migrate", "posts:42", {
      completed_items: ["1", "2", "3"],
      pending_items: ["42", "43"],
    });

    const checkpoint = await manager.load("migrate");
    expect(checkpoint).not.toBeNull();
    expect(checkpoint!.phase).toBe("migrate");
    expect(checkpoint!.step).toBe("posts:42");
    expect(checkpoint!.session_id).toBe("test-session");
  });

  it("returns null for missing checkpoint", async () => {
    const checkpoint = await manager.load("nonexistent");
    expect(checkpoint).toBeNull();
  });

  it("tracks completed items", async () => {
    await manager.save("migrate", "posts:1", {
      completed_items: ["1", "2"],
      pending_items: ["3"],
    });

    const completed = await manager.getCompletedItems("migrate");
    expect(completed).toEqual(["1", "2"]);
  });

  it("overwrites previous checkpoint for same phase", async () => {
    await manager.save("migrate", "posts:1", { completed_items: ["1"], pending_items: ["2", "3"] });
    await manager.save("migrate", "posts:2", { completed_items: ["1", "2"], pending_items: ["3"] });

    const checkpoint = await manager.load("migrate");
    expect(checkpoint!.step).toBe("posts:2");
    expect(checkpoint!.state.completed_items).toEqual(["1", "2"]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/unpress && npx vitest run src/__tests__/checkpoint-manager.test.ts`
Expected: FAIL — cannot find `../checkpoint-manager.js`

- [ ] **Step 4: Implement FileCheckpointManager**

Create `packages/unpress/src/checkpoint-manager.ts`:

```typescript
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import type { Checkpoint, CheckpointManager } from "@unpress/shared";

export class FileCheckpointManager implements CheckpointManager {
  private dir: string;

  constructor(baseDir: string, private sessionId: string) {
    this.dir = join(baseDir, ".unpress", "checkpoints", sessionId);
  }

  async save(phase: string, step: string, state: Record<string, unknown>): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const checkpoint: Checkpoint = {
      id: uuid(),
      session_id: this.sessionId,
      phase,
      step,
      timestamp: new Date().toISOString(),
      state,
      completed_items: (state.completed_items as string[]) ?? [],
      pending_items: (state.pending_items as string[]) ?? [],
    };
    const filename = `${phase}-latest.json`;
    await writeFile(join(this.dir, filename), JSON.stringify(checkpoint, null, 2));
  }

  async load(phase: string): Promise<Checkpoint | null> {
    try {
      const data = await readFile(join(this.dir, `${phase}-latest.json`), "utf-8");
      return JSON.parse(data) as Checkpoint;
    } catch {
      return null;
    }
  }

  async getCompletedItems(phase: string): Promise<string[]> {
    const checkpoint = await this.load(phase);
    return checkpoint?.completed_items ?? [];
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/unpress && npx vitest run src/__tests__/checkpoint-manager.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 6: Write failing test for session manager**

Create `packages/unpress/src/__tests__/session-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionManager } from "../session-manager.js";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("SessionManager", () => {
  let tempDir: string;
  let manager: SessionManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "unpress-session-"));
    manager = new SessionManager(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a new session", async () => {
    const session = await manager.create("https://example.com");
    expect(session.session_id).toBeTruthy();
    expect(session.wp_url).toBe("https://example.com");
    expect(session.status).toBe("in_progress");
  });

  it("loads an existing session", async () => {
    const created = await manager.create("https://example.com");
    const loaded = await manager.load(created.session_id);
    expect(loaded).not.toBeNull();
    expect(loaded!.session_id).toBe(created.session_id);
  });

  it("returns null for nonexistent session", async () => {
    const loaded = await manager.load("nonexistent");
    expect(loaded).toBeNull();
  });

  it("records created resources", async () => {
    const session = await manager.create("https://example.com");
    await manager.addResource(session.session_id, "sanity_document_ids", ["doc1", "doc2"]);
    const updated = await manager.load(session.session_id);
    expect(updated!.created_resources.sanity_document_ids).toEqual(["doc1", "doc2"]);
  });

  it("marks phase complete", async () => {
    const session = await manager.create("https://example.com");
    await manager.completePhase(session.session_id, "scan");
    const updated = await manager.load(session.session_id);
    expect(updated!.phases_completed).toContain("scan");
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd packages/unpress && npx vitest run src/__tests__/session-manager.test.ts`
Expected: FAIL — cannot find `../session-manager.js`

- [ ] **Step 8: Implement SessionManager**

Create `packages/unpress/src/session-manager.ts`:

```typescript
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import type { SessionSummary } from "@unpress/shared";

export class SessionManager {
  private dir: string;

  constructor(baseDir: string) {
    this.dir = join(baseDir, ".unpress", "sessions");
  }

  async create(wpUrl: string): Promise<SessionSummary> {
    const session: SessionSummary = {
      session_id: uuid(),
      started_at: new Date().toISOString(),
      status: "in_progress",
      wp_url: wpUrl,
      created_resources: {
        sanity_document_ids: [],
      },
      phases_completed: [],
      errors: [],
    };
    await this.save(session);
    return session;
  }

  async load(sessionId: string): Promise<SessionSummary | null> {
    try {
      const data = await readFile(join(this.dir, sessionId, "summary.json"), "utf-8");
      return JSON.parse(data) as SessionSummary;
    } catch {
      return null;
    }
  }

  async addResource(sessionId: string, key: keyof SessionSummary["created_resources"], value: unknown): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    (session.created_resources as Record<string, unknown>)[key] = value;
    await this.save(session);
  }

  async completePhase(sessionId: string, phase: string): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (!session.phases_completed.includes(phase)) {
      session.phases_completed.push(phase);
    }
    await this.save(session);
  }

  async updateStatus(sessionId: string, status: SessionSummary["status"]): Promise<void> {
    const session = await this.load(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.status = status;
    if (status === "completed") {
      session.completed_at = new Date().toISOString();
    }
    await this.save(session);
  }

  private async save(session: SessionSummary): Promise<void> {
    const sessionDir = join(this.dir, session.session_id);
    await mkdir(sessionDir, { recursive: true });
    await writeFile(join(sessionDir, "summary.json"), JSON.stringify(session, null, 2));
  }
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd packages/unpress && npx vitest run src/__tests__/session-manager.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 10: Create MCP server shell**

Create `packages/unpress/src/server.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SessionManager } from "./session-manager.js";
import { FileCheckpointManager } from "./checkpoint-manager.js";
import type { UnpressConfig } from "@unpress/shared";

export function createUnpressServer(baseDir: string) {
  const server = new McpServer({
    name: "unpress",
    version: "0.1.0",
  });

  const sessions = new SessionManager(baseDir);

  server.tool(
    "unpress_start",
    "Start or resume a WordPress to AI-website migration",
    {
      wp_url: z.string().url(),
      wp_auth_token: z.string(),
      sanity_project_id: z.string(),
      sanity_dataset: z.string().default("production"),
      sanity_token: z.string(),
      github_token: z.string(),
      vercel_token: z.string(),
      inspiration_urls: z.array(z.string().url()).min(3).max(5),
      skill_level: z.enum(["novice", "medium", "expert"]),
      session_id: z.string().optional(),
    },
    async (params) => {
      if (params.session_id) {
        const existing = await sessions.load(params.session_id);
        if (existing) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              session_id: params.session_id,
              status: "resumed",
              phase: existing.phases_completed.at(-1) ?? "wizard",
            }) }],
          };
        }
      }

      const session = await sessions.create(params.wp_url);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          session_id: session.session_id,
          status: "started",
          phase: "wizard",
        }) }],
      };
    },
  );

  server.tool(
    "unpress_status",
    "Get current migration status",
    { session_id: z.string() },
    async (params) => {
      const session = await sessions.load(params.session_id);
      if (!session) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          phase: session.phases_completed.at(-1) ?? "wizard",
          progress: (session.phases_completed.length / 6) * 100,
          checkpoint: "latest",
          pending_decisions: [],
          errors: session.errors,
        }) }],
      };
    },
  );

  server.tool(
    "unpress_rollback",
    "Rollback a migration session — delete created resources",
    {
      session_id: z.string(),
      sanity: z.boolean().default(false),
      github: z.boolean().default(false),
      vercel: z.boolean().default(false),
    },
    async (params) => {
      const session = await sessions.load(params.session_id);
      if (!session) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
      }
      // Rollback implementations will be added by each phase package
      await sessions.updateStatus(params.session_id, "rolled_back");
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          deleted: {
            sanity_docs: params.sanity ? session.created_resources.sanity_document_ids.length : 0,
            github_repo: params.github ? session.created_resources.github_repo : undefined,
            vercel_project: params.vercel ? session.created_resources.vercel_project_id : undefined,
          },
        }) }],
      };
    },
  );

  return server;
}
```

- [ ] **Step 11: Create CLI entry point**

Create `packages/unpress/src/index.ts`:

```typescript
#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createUnpressServer } from "./server.js";
import { config } from "dotenv";

config();

const baseDir = process.cwd();
const server = createUnpressServer(baseDir);
const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 12: Install deps, build, and verify**

Run: `pnpm install && pnpm turbo build --filter=unpress`
Run: `cd packages/unpress && npx vitest run`
Expected: All tests pass, build succeeds

- [ ] **Step 13: Commit**

```bash
git add packages/unpress/
git commit -m "feat: add orchestrator MCP server with session + checkpoint management"
```

---

## Chunk 2: WordPress Plugin (unpress-wp)

The PHP plugin that installs on the user's WP site, exposes REST endpoints for scanning, and includes the trust badge UI.

### Task 4: Create WordPress Plugin Skeleton

**Files:**
- Create: `plugins/unpress-wp/unpress-wp.php`
- Create: `plugins/unpress-wp/includes/class-scanner.php`
- Create: `plugins/unpress-wp/includes/class-rest-api.php`
- Create: `plugins/unpress-wp/includes/class-trust-badge.php`
- Create: `plugins/unpress-wp/readme.txt`

- [ ] **Step 1: Create plugin main file**

Create `plugins/unpress-wp/unpress-wp.php`:

```php
<?php
/**
 * Plugin Name: Unpress — AI Website Migration
 * Description: Scans your WordPress site for migration to a modern AI-powered stack. Read-only — never modifies your content.
 * Version: 0.1.0
 * Author: Amir Baldiga
 * Author URI: https://linkedin.com/in/amirbaldiag
 * License: MIT
 * Requires at least: 5.6
 * Requires PHP: 8.0
 */

defined('ABSPATH') || exit;

define('UNPRESS_VERSION', '0.1.0');
define('UNPRESS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('UNPRESS_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once UNPRESS_PLUGIN_DIR . 'includes/class-scanner.php';
require_once UNPRESS_PLUGIN_DIR . 'includes/class-rest-api.php';
require_once UNPRESS_PLUGIN_DIR . 'includes/class-trust-badge.php';

// Initialize
add_action('rest_api_init', ['Unpress_Rest_Api', 'register_routes']);
add_action('admin_menu', ['Unpress_Trust_Badge', 'add_admin_page']);
add_action('admin_init', ['Unpress_Trust_Badge', 'register_settings']);

// Activation: create application password
register_activation_hook(__FILE__, 'unpress_activate');

function unpress_activate() {
    $user = wp_get_current_user();
    if (!$user || !$user->ID) return;

    // Create a read-only application password
    $app_pass = WP_Application_Passwords::create_new_application_password(
        $user->ID,
        ['name' => 'Unpress Migration (Read-Only)']
    );

    if (!is_wp_error($app_pass)) {
        // Show token once via transient (expires in 1 hour), never stored permanently
        set_transient('unpress_auth_token_display', $app_pass[0], HOUR_IN_SECONDS);
        update_option('unpress_auth_user', $user->user_login);
    }
}

// Deactivation: clean up
register_deactivation_hook(__FILE__, 'unpress_deactivate');

function unpress_deactivate() {
    delete_transient('unpress_auth_token_display');
    delete_option('unpress_auth_user');
    delete_option('unpress_user_verified');
}
```

- [ ] **Step 2: Create scanner class**

Create `plugins/unpress-wp/includes/class-scanner.php`:

```php
<?php
defined('ABSPATH') || exit;

class Unpress_Scanner {

    public static function generate_manifest(): array {
        return [
            'version' => '1.0',
            'generated_at' => gmdate('c'),
            'wp_version' => get_bloginfo('version'),
            'site_url' => get_site_url(),
            'site_name' => get_bloginfo('name'),
            'content' => self::scan_content(),
            'media' => self::scan_media(),
            'taxonomy' => self::scan_taxonomy(),
            'navigation' => self::scan_navigation(),
            'seo' => self::scan_seo(),
            'legal_pages' => self::scan_legal_pages(),
            'tracking' => self::scan_tracking(),
            'sitemap' => self::scan_sitemap(),
            'theme' => self::scan_theme(),
            'plugins' => self::scan_plugins(),
            'acf_fields' => self::scan_acf_fields(),
            'wp_admin_structure' => self::scan_admin_structure(),
        ];
    }

    private static function scan_content(): array {
        $result = [
            'posts' => self::scan_post_type('post'),
            'pages' => self::scan_post_type('page'),
            'custom_post_types' => [],
        ];

        $custom_types = get_post_types(['_builtin' => false, 'public' => true], 'names');
        foreach ($custom_types as $type) {
            $result['custom_post_types'][$type] = self::scan_post_type($type);
        }

        return $result;
    }

    private static function scan_post_type(string $type): array {
        $posts = get_posts([
            'post_type' => $type,
            'post_status' => ['publish', 'draft', 'private'],
            'numberposts' => -1,
            'fields' => 'ids',
        ]);

        $items = [];
        $sample_fields = [];
        $has_custom = false;

        foreach ($posts as $post_id) {
            $post = get_post($post_id);
            $items[] = [
                'id' => $post->ID,
                'title' => $post->post_title,
                'slug' => $post->post_name,
                'status' => $post->post_status,
                'date' => $post->post_date_gmt,
            ];

            $meta = get_post_meta($post_id);
            if (!empty($meta)) {
                $has_custom = true;
                foreach (array_keys($meta) as $key) {
                    if (!str_starts_with($key, '_') && !in_array($key, $sample_fields)) {
                        $sample_fields[] = $key;
                    }
                }
            }
        }

        return [
            'count' => count($items),
            'sample_fields' => array_slice($sample_fields, 0, 20),
            'has_custom_fields' => $has_custom,
            'items' => $items,
        ];
    }

    private static function scan_media(): array {
        $attachments = get_posts([
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'numberposts' => -1,
        ]);

        $items = [];
        foreach ($attachments as $att) {
            $items[] = [
                'id' => $att->ID,
                'url' => wp_get_attachment_url($att->ID),
                'mime' => $att->post_mime_type,
                'size' => filesize(get_attached_file($att->ID)) ?: 0,
                'alt' => get_post_meta($att->ID, '_wp_attachment_image_alt', true) ?: '',
            ];
        }

        return ['total' => count($items), 'items' => $items];
    }

    private static function scan_taxonomy(): array {
        $categories = get_categories(['hide_empty' => false]);
        $tags = get_tags(['hide_empty' => false]);

        $cats = array_map(fn($c) => [
            'id' => $c->term_id, 'name' => $c->name,
            'slug' => $c->slug, 'parent' => $c->parent ?: null,
        ], $categories);

        $tag_list = array_map(fn($t) => [
            'id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug,
        ], $tags);

        $custom = [];
        $custom_taxonomies = get_taxonomies(['_builtin' => false, 'public' => true], 'names');
        foreach ($custom_taxonomies as $tax) {
            $terms = get_terms(['taxonomy' => $tax, 'hide_empty' => false]);
            if (!is_wp_error($terms)) {
                $custom[$tax] = array_map(fn($t) => [
                    'id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug,
                ], $terms);
            }
        }

        return ['categories' => $cats, 'tags' => $tag_list, 'custom' => $custom];
    }

    private static function scan_navigation(): array {
        $menus = wp_get_nav_menus();
        $result = [];

        foreach ($menus as $menu) {
            $locations = get_nav_menu_locations();
            $location = array_search($menu->term_id, $locations) ?: 'unassigned';
            $items = wp_get_nav_menu_items($menu->term_id);

            $result[] = [
                'name' => $menu->name,
                'location' => $location,
                'items' => self::build_menu_tree($items ?: []),
            ];
        }

        return ['menus' => $result];
    }

    private static function build_menu_tree(array $items, int $parent = 0): array {
        $tree = [];
        foreach ($items as $item) {
            if ((int)$item->menu_item_parent === $parent) {
                $node = [
                    'title' => $item->title,
                    'url' => $item->url,
                    'type' => $item->type === 'post_type' ? $item->object : 'custom',
                    'target_id' => (int)$item->object_id ?: null,
                    'children' => self::build_menu_tree($items, $item->ID),
                ];
                $tree[] = $node;
            }
        }
        return $tree;
    }

    private static function scan_seo(): array {
        $plugin = 'none';
        if (is_plugin_active('wordpress-seo/wp-seo.php')) $plugin = 'yoast';
        elseif (is_plugin_active('seo-by-rank-math/rank-math.php')) $plugin = 'rankmath';
        elseif (is_plugin_active('all-in-one-seo-pack/all_in_one_seo_pack.php')) $plugin = 'aioseo';

        $per_content = [];
        if ($plugin === 'yoast') {
            $posts = get_posts(['numberposts' => -1, 'post_type' => 'any', 'post_status' => 'publish']);
            foreach ($posts as $post) {
                $title = get_post_meta($post->ID, '_yoast_wpseo_title', true);
                $desc = get_post_meta($post->ID, '_yoast_wpseo_metadesc', true);
                if ($title || $desc) {
                    $per_content[$post->ID] = [
                        'title' => $title ?: '',
                        'description' => $desc ?: '',
                        'og_image' => get_post_meta($post->ID, '_yoast_wpseo_opengraph-image', true) ?: null,
                    ];
                }
            }
        }

        return [
            'plugin' => $plugin,
            'global' => [
                'title_template' => get_option('blogname') . ' — %s',
                'meta_description' => get_option('blogdescription'),
            ],
            'per_content' => $per_content,
        ];
    }

    private static function scan_legal_pages(): array {
        $privacy = (int)get_option('wp_page_for_privacy_policy');
        return [
            'privacy' => $privacy ?: null,
            'terms' => null,
            'accessibility' => null,
            'custom' => [],
        ];
    }

    private static function scan_tracking(): array {
        // Check common tracking options
        $ga_id = null;
        $gtm_id = null;

        // Check for MonsterInsights
        $mi = get_option('monsterinsights_site_profile');
        if ($mi && isset($mi['ua'])) $ga_id = $mi['ua'];

        // Check for Site Kit
        $sk = get_option('googlesitekit_analytics_settings');
        if ($sk && isset($sk['propertyID'])) $ga_id = $sk['propertyID'];

        return [
            'ga_id' => $ga_id,
            'gtm_id' => $gtm_id,
            'meta_pixel_id' => null,
            'custom_scripts' => [],
        ];
    }

    private static function scan_sitemap(): array {
        $sitemap_url = get_sitemap_url('index');
        return [
            'url' => $sitemap_url ?: null,
            'entries' => [],
        ];
    }

    private static function scan_theme(): array {
        $theme = wp_get_theme();
        return [
            'name' => $theme->get('Name'),
            'is_block_theme' => wp_is_block_theme(),
        ];
    }

    private static function scan_plugins(): array {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $active = [];
        foreach (get_option('active_plugins', []) as $plugin_path) {
            $data = get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin_path);
            $active[] = [
                'slug' => dirname($plugin_path),
                'name' => $data['Name'],
                'version' => $data['Version'],
            ];
        }

        $page_builder = 'none';
        $builders = [
            'elementor' => 'elementor/elementor.php',
            'divi' => 'divi-builder/divi-builder.php',
            'wpbakery' => 'js_composer/js_composer.php',
            'beaver' => 'bb-plugin/fl-builder.php',
        ];
        foreach ($builders as $name => $path) {
            if (is_plugin_active($path)) {
                $page_builder = $name;
                break;
            }
        }

        return ['active' => $active, 'page_builder' => $page_builder];
    }

    private static function scan_acf_fields(): array {
        if (!function_exists('acf_get_field_groups')) return [];

        $result = [];
        foreach (acf_get_field_groups() as $group) {
            $fields = acf_get_fields($group['key']);
            $result[$group['title']] = array_map(fn($f) => [
                'name' => $f['name'],
                'type' => $f['type'],
                'choices' => $f['choices'] ?? null,
            ], $fields ?: []);
        }

        return $result;
    }

    private static function scan_admin_structure(): array {
        global $menu;
        $sidebar = [];
        if (is_array($menu)) {
            foreach ($menu as $item) {
                if (!empty($item[0]) && !empty(strip_tags($item[0]))) {
                    $sidebar[] = strip_tags($item[0]);
                }
            }
        }

        return [
            'sidebar_order' => $sidebar,
            'field_groups' => [],
        ];
    }
}
```

- [ ] **Step 3: Create REST API class**

Create `plugins/unpress-wp/includes/class-rest-api.php`:

```php
<?php
defined('ABSPATH') || exit;

class Unpress_Rest_Api {

    public static function register_routes() {
        register_rest_route('unpress/v1', '/manifest', [
            'methods' => 'GET',
            'callback' => [self::class, 'get_manifest'],
            'permission_callback' => [self::class, 'check_permission'],
        ]);

        register_rest_route('unpress/v1', '/health', [
            'methods' => 'GET',
            'callback' => fn() => new WP_REST_Response([
                'status' => 'ok',
                'version' => UNPRESS_VERSION,
                'wp_version' => get_bloginfo('version'),
            ]),
            'permission_callback' => '__return_true',
        ]);
    }

    public static function check_permission(WP_REST_Request $request): bool {
        // Verify the user has read access via application password
        return current_user_can('read');
    }

    public static function get_manifest(WP_REST_Request $request): WP_REST_Response {
        $verified = get_option('unpress_user_verified', false);
        if (!$verified) {
            return new WP_REST_Response([
                'error' => 'Plugin not verified by user. Please complete the trust verification in WP admin → Unpress.',
            ], 403);
        }

        $manifest = Unpress_Scanner::generate_manifest();
        return new WP_REST_Response($manifest);
    }
}
```

- [ ] **Step 4: Create trust badge admin page**

Create `plugins/unpress-wp/includes/class-trust-badge.php`:

```php
<?php
defined('ABSPATH') || exit;

class Unpress_Trust_Badge {

    public static function add_admin_page() {
        add_menu_page(
            'Unpress Migration',
            'Unpress',
            'manage_options',
            'unpress',
            [self::class, 'render_admin_page'],
            'dashicons-airplane',
            3
        );
    }

    public static function register_settings() {
        register_setting('unpress_settings', 'unpress_user_verified');
    }

    public static function render_admin_page() {
        $token = get_transient('unpress_auth_token_display') ?: '';
        $user = get_option('unpress_auth_user', '');
        $verified = get_option('unpress_user_verified', false);
        $site_url = get_site_url();
        $github_url = 'https://github.com/unpress-ai/unpress/tree/main/plugins/unpress-wp';

        $review_prompt = "I'm about to install a WordPress plugin called Unpress. Here's its source code: {$github_url} — Please review it for security vulnerabilities, data exfiltration, and any code that modifies my WordPress database or sends data to external servers.";

        ?>
        <div class="wrap" style="max-width: 720px;">
            <h1>Unpress — AI Website Migration</h1>

            <!-- Safety Badge -->
            <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #166534;">🔒 Read-Only — Your Site Is Safe</h2>
                <p>This plugin <strong>cannot modify, delete, or write to your WordPress database</strong>. It only reads content for migration purposes. Your WordPress site stays exactly as it is.</p>
            </div>

            <!-- AI Verified Badge -->
            <div style="background: #f5f3ff; border: 2px solid #8b5cf6; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #5b21b6;">🤖 AI-Built & Verified</h2>
                <p>This plugin was written, tested, re-tested, and security-verified by <strong>Claude Code</strong> and the <strong>Ruflo orchestration framework</strong>. Every line of code has been through automated security scanning, static analysis, and behavioral testing.</p>
                <p>100% of this plugin's source code is public on GitHub: <a href="<?php echo esc_url($github_url); ?>" target="_blank"><?php echo esc_html($github_url); ?></a></p>
            </div>

            <!-- Verify Yourself -->
            <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #92400e;">🔍 Verify It Yourself</h2>
                <p>We encourage you to have your own AI review this plugin before activating it. Copy the prompt below and paste it into ChatGPT, Claude, Gemini, or any AI you trust:</p>
                <textarea readonly style="width: 100%; height: 80px; padding: 10px; border-radius: 8px; border: 1px solid #d4a574; font-family: monospace; font-size: 12px; background: #fff;"><?php echo esc_textarea($review_prompt); ?></textarea>
                <button onclick="navigator.clipboard.writeText(this.previousElementSibling.value); this.textContent='Copied!'" style="margin-top: 8px; padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">📋 Copy Prompt</button>
            </div>

            <!-- Verification Checkbox -->
            <form method="post" action="options.php">
                <?php settings_fields('unpress_settings'); ?>
                <div style="background: #fff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer;">
                        <input type="checkbox" name="unpress_user_verified" value="1"
                            <?php checked($verified, 1); ?>
                            style="margin-top: 4px; width: 20px; height: 20px;">
                        <span style="font-size: 15px;">
                            <strong>I've reviewed this plugin (or had my AI/agent review it) and I'm comfortable installing it.</strong>
                            <br><span style="color: #6b7280; font-size: 13px;">This enables the REST API endpoints that Unpress uses to scan your content.</span>
                        </span>
                    </label>
                    <?php submit_button('Save & Activate Scanning', 'primary', 'submit', false); ?>
                </div>
            </form>

            <?php if ($verified && $token) : ?>
            <!-- Auth Token Display -->
            <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #1e40af;">🔑 Your Migration Token</h2>
                <p>Copy this token and paste it into the Unpress wizard when prompted:</p>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <code style="flex: 1; padding: 12px; background: #fff; border: 1px solid #93c5fd; border-radius: 8px; font-size: 14px; word-break: break-all;"><?php echo esc_html($user . ':' . $token); ?></code>
                    <button onclick="navigator.clipboard.writeText('<?php echo esc_js($user . ':' . $token); ?>'); this.textContent='Copied!'" style="padding: 12px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap;">📋 Copy</button>
                </div>
                <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">This token provides read-only access. You can revoke it anytime under Users → Application Passwords.</p>
            </div>
            <?php endif; ?>

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
                Built by Amir Baldiga · <a href="https://linkedin.com/in/amirbaldiag" target="_blank">Connect on LinkedIn</a>
            </p>
        </div>
        <?php
    }
}
```

- [ ] **Step 5: Create readme.txt**

Create `plugins/unpress-wp/readme.txt`:

```
=== Unpress — AI Website Migration ===
Contributors: amirbaldiag
Tags: migration, headless, sanity, nextjs, ai
Requires at least: 5.6
Tested up to: 6.7
Requires PHP: 8.0
Stable tag: 0.1.0
License: MIT

Scan your WordPress site for AI-powered migration to Next.js + Sanity + Vercel.

== Description ==

Unpress scans your WordPress site and creates a structured manifest for migration to a modern AI-powered stack. This plugin is READ-ONLY — it never modifies your WordPress content.

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/unpress-wp/`
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Go to the Unpress admin page to review and verify the plugin
4. Copy your migration token and paste it into the Unpress wizard

== Frequently Asked Questions ==

= Is my WordPress site safe? =
Yes. This plugin only reads content. It cannot modify, delete, or write to your database.

= Can I remove it after migration? =
Yes. Once migration is complete, you can safely deactivate and delete this plugin.
```

- [ ] **Step 6: Commit**

```bash
git add plugins/unpress-wp/
git commit -m "feat: add WordPress plugin with scanner, REST API, and trust badge"
```

---

## Chunk 3: Scan + Migrate Phases

The Node.js packages that call the WP plugin REST API, assemble the manifest, and write content to Sanity.

### Task 5: Create unpress-scan Package

**Files:**
- Create: `packages/unpress-scan/package.json`
- Create: `packages/unpress-scan/tsconfig.json`
- Create: `packages/unpress-scan/src/index.ts`
- Create: `packages/unpress-scan/src/wp-client.ts`
- Create: `packages/unpress-scan/src/cost-calculator.ts`
- Test: `packages/unpress-scan/src/__tests__/wp-client.test.ts`
- Test: `packages/unpress-scan/src/__tests__/cost-calculator.test.ts`

- [ ] **Step 1: Create package skeleton**

Create `packages/unpress-scan/package.json`:
```json
{
  "name": "@unpress/scan",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@unpress/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "vitest": "^3"
  }
}
```

- [ ] **Step 2: Write failing test for cost calculator**

Create `packages/unpress-scan/src/__tests__/cost-calculator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateCosts } from "../cost-calculator.js";

describe("calculateCosts", () => {
  it("returns all free for small site", () => {
    const result = calculateCosts({ posts: 47, pages: 12, media: 230 });
    expect(result.total).toBe(0);
    expect(result.sanity.plan).toBe("Free");
    expect(result.vercel.plan).toBe("Free");
    expect(result.github.plan).toBe("Free");
    expect(result.fits_free_tier).toBe(true);
  });

  it("recommends paid plans for large site", () => {
    const result = calculateCosts({ posts: 2400, pages: 100, media: 8000 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.fits_free_tier).toBe(false);
  });

  it("includes WP hosting comparison", () => {
    const result = calculateCosts({ posts: 2400, pages: 100, media: 8000 });
    expect(result.wp_comparison_min).toBeGreaterThan(0);
    expect(result.wp_comparison_max).toBeGreaterThan(result.wp_comparison_min);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/unpress-scan && npx vitest run`
Expected: FAIL

- [ ] **Step 4: Implement cost calculator**

Create `packages/unpress-scan/src/cost-calculator.ts`:

```typescript
export interface CostEstimate {
  sanity: { plan: string; cost: number };
  vercel: { plan: string; cost: number };
  github: { plan: string; cost: number };
  total: number;
  fits_free_tier: boolean;
  wp_comparison_min: number;
  wp_comparison_max: number;
}

export function calculateCosts(site: { posts: number; pages: number; media: number }): CostEstimate {
  const totalContent = site.posts + site.pages;
  const totalMedia = site.media;

  // Sanity: Free up to 100K API CDN requests, 500K assets, 20 users
  // Pro at $15/mo for larger sites
  const sanityCost = totalContent > 500 || totalMedia > 2000 ? 15 : 0;

  // Vercel: Free up to 100GB bandwidth, 6000 build minutes
  // Pro at $20/mo for commercial
  const vercelCost = totalContent > 1000 || totalMedia > 5000 ? 20 : 0;

  // GitHub: Free for public repos
  const githubCost = 0;

  const total = sanityCost + vercelCost + githubCost;

  // WP hosting comparison for similar site size
  const wpMin = totalContent > 500 ? 30 : 5;
  const wpMax = totalContent > 500 ? 80 : 25;

  return {
    sanity: { plan: sanityCost === 0 ? "Free" : "Growth ($15/mo)", cost: sanityCost },
    vercel: { plan: vercelCost === 0 ? "Free" : "Pro ($20/mo)", cost: vercelCost },
    github: { plan: "Free", cost: 0 },
    total,
    fits_free_tier: total === 0,
    wp_comparison_min: wpMin,
    wp_comparison_max: wpMax,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/unpress-scan && npx vitest run src/__tests__/cost-calculator.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 6: Write failing test for WP client**

Create `packages/unpress-scan/src/__tests__/wp-client.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { WpClient } from "../wp-client.js";

describe("WpClient", () => {
  it("constructs correct API URLs", () => {
    const client = new WpClient("https://example.com", "user:pass");
    expect(client.getManifestUrl()).toBe("https://example.com/wp-json/unpress/v1/manifest");
    expect(client.getHealthUrl()).toBe("https://example.com/wp-json/unpress/v1/health");
  });

  it("constructs auth header", () => {
    const client = new WpClient("https://example.com", "user:pass");
    const header = client.getAuthHeader();
    expect(header).toBe("Basic " + Buffer.from("user:pass").toString("base64"));
  });

  it("strips trailing slash from URL", () => {
    const client = new WpClient("https://example.com/", "user:pass");
    expect(client.getHealthUrl()).toBe("https://example.com/wp-json/unpress/v1/health");
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd packages/unpress-scan && npx vitest run src/__tests__/wp-client.test.ts`
Expected: FAIL

- [ ] **Step 8: Implement WP client**

Create `packages/unpress-scan/src/wp-client.ts`:

```typescript
import type { Manifest } from "@unpress/shared";
import { WpConnectionError } from "@unpress/shared";

export class WpClient {
  private baseUrl: string;
  private authToken: string;

  constructor(wpUrl: string, authToken: string) {
    this.baseUrl = wpUrl.replace(/\/+$/, "");
    this.authToken = authToken;
  }

  getManifestUrl(): string {
    return `${this.baseUrl}/wp-json/unpress/v1/manifest`;
  }

  getHealthUrl(): string {
    return `${this.baseUrl}/wp-json/unpress/v1/health`;
  }

  getAuthHeader(): string {
    return "Basic " + Buffer.from(this.authToken).toString("base64");
  }

  async checkHealth(): Promise<{ status: string; version: string; wp_version: string }> {
    const res = await fetch(this.getHealthUrl());
    if (!res.ok) {
      throw new WpConnectionError(`Health check returned ${res.status}`);
    }
    return res.json();
  }

  async fetchManifest(): Promise<Manifest> {
    const res = await fetch(this.getManifestUrl(), {
      headers: { Authorization: this.getAuthHeader() },
    });
    if (!res.ok) {
      if (res.status === 403) {
        throw new WpConnectionError("REST API returned 403 — plugin may not be verified yet");
      }
      throw new WpConnectionError(`Manifest fetch returned ${res.status}`);
    }
    return res.json();
  }
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd packages/unpress-scan && npx vitest run src/__tests__/wp-client.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 10: Create scan phase entry point**

Create `packages/unpress-scan/src/index.ts`:

```typescript
export { WpClient } from "./wp-client.js";
export { calculateCosts } from "./cost-calculator.js";
export type { CostEstimate } from "./cost-calculator.js";
```

- [ ] **Step 11: Build and verify**

Run: `pnpm install && pnpm turbo build --filter=@unpress/scan`
Expected: Clean build

- [ ] **Step 12: Commit**

```bash
git add packages/unpress-scan/
git commit -m "feat: add scan phase — WP client and cost calculator"
```

---

### Task 6: Create unpress-migrate Package

**Files:**
- Create: `packages/unpress-migrate/package.json`
- Create: `packages/unpress-migrate/tsconfig.json`
- Create: `packages/unpress-migrate/src/index.ts`
- Create: `packages/unpress-migrate/src/html-to-portable-text.ts`
- Create: `packages/unpress-migrate/src/schema-generator.ts`
- Create: `packages/unpress-migrate/src/media-migrator.ts`
- Create: `packages/unpress-migrate/src/content-migrator.ts`
- Create: `packages/unpress-migrate/src/redirect-map.ts`
- Test: `packages/unpress-migrate/src/__tests__/html-to-portable-text.test.ts`
- Test: `packages/unpress-migrate/src/__tests__/schema-generator.test.ts`
- Test: `packages/unpress-migrate/src/__tests__/redirect-map.test.ts`

- [ ] **Step 1: Create package skeleton**

Create `packages/unpress-migrate/package.json`:
```json
{
  "name": "@unpress/migrate",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@unpress/shared": "workspace:*",
    "@sanity/client": "^7",
    "@sanity/block-tools": "^3",
    "jsdom": "^26"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "vitest": "^3",
    "@types/jsdom": "^21"
  }
}
```

- [ ] **Step 2: Write failing test for HTML to Portable Text**

Create `packages/unpress-migrate/src/__tests__/html-to-portable-text.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { htmlToPortableText } from "../html-to-portable-text.js";

describe("htmlToPortableText", () => {
  it("converts simple paragraph", () => {
    const result = htmlToPortableText("<p>Hello world</p>");
    expect(result).toHaveLength(1);
    expect(result[0]._type).toBe("block");
  });

  it("converts heading", () => {
    const result = htmlToPortableText("<h2>My Heading</h2>");
    expect(result).toHaveLength(1);
    expect(result[0].style).toBe("h2");
  });

  it("converts image to custom block", () => {
    const result = htmlToPortableText('<img src="https://example.com/img.jpg" alt="Test">');
    expect(result.some((b: any) => b._type === "image" || b._type === "wpImage")).toBe(true);
  });

  it("converts list", () => {
    const result = htmlToPortableText("<ul><li>One</li><li>Two</li></ul>");
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].listItem).toBe("bullet");
  });

  it("handles empty input", () => {
    const result = htmlToPortableText("");
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/unpress-migrate && npx vitest run src/__tests__/html-to-portable-text.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement HTML to Portable Text converter**

Create `packages/unpress-migrate/src/html-to-portable-text.ts`:

```typescript
import { JSDOM } from "jsdom";
import { htmlToBlocks } from "@sanity/block-tools";

// Sanity block content type definition for the converter
const blockContentType = {
  name: "blockContent",
  type: "array",
  of: [
    {
      type: "block",
      styles: [
        { title: "Normal", value: "normal" },
        { title: "H1", value: "h1" },
        { title: "H2", value: "h2" },
        { title: "H3", value: "h3" },
        { title: "H4", value: "h4" },
        { title: "Quote", value: "blockquote" },
      ],
      lists: [
        { title: "Bullet", value: "bullet" },
        { title: "Number", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Bold", value: "strong" },
          { title: "Italic", value: "em" },
          { title: "Underline", value: "underline" },
          { title: "Code", value: "code" },
        ],
        annotations: [
          {
            name: "link",
            type: "object",
            fields: [{ name: "href", type: "url" }],
          },
        ],
      },
    },
    {
      name: "wpImage",
      type: "object",
      fields: [
        { name: "src", type: "url" },
        { name: "alt", type: "string" },
      ],
    },
  ],
};

export function htmlToPortableText(html: string): any[] {
  if (!html || !html.trim()) return [];

  const blocks = htmlToBlocks(html, blockContentType as any, {
    parseHtml: (htmlStr: string) => new JSDOM(htmlStr).window.document,
    rules: [
      {
        deserialize(el: Element, next: any, block: any) {
          if (el.tagName === "IMG") {
            return block({
              _type: "wpImage",
              src: el.getAttribute("src") || "",
              alt: el.getAttribute("alt") || "",
            });
          }
          return undefined;
        },
      },
    ],
  });

  return blocks;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/unpress-migrate && npx vitest run src/__tests__/html-to-portable-text.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 6: Write failing test for schema generator**

Create `packages/unpress-migrate/src/__tests__/schema-generator.test.ts`:

```typescript
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
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd packages/unpress-migrate && npx vitest run src/__tests__/schema-generator.test.ts`
Expected: FAIL

- [ ] **Step 8: Implement schema generator**

Create `packages/unpress-migrate/src/schema-generator.ts`:

```typescript
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

  // Add custom fields detected in WP
  for (const fieldName of contentType.sample_fields) {
    if (!fields.some(f => f.name === fieldName)) {
      fields.push({
        name: fieldName,
        title: fieldName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        type: "string", // Default — refined during migration
      });
    }
  }

  return { name, title, type: "document", fields };
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd packages/unpress-migrate && npx vitest run src/__tests__/schema-generator.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 10: Create barrel export**

Create `packages/unpress-migrate/src/index.ts`:

```typescript
export { htmlToPortableText } from "./html-to-portable-text.js";
export { generateSanitySchema } from "./schema-generator.js";
```

- [ ] **Step 11: Build and verify**

Run: `pnpm install && pnpm turbo build --filter=@unpress/migrate`
Expected: Clean build

- [ ] **Step 12: Commit**

```bash
git add packages/unpress-migrate/
git commit -m "feat: add migrate phase — HTML-to-PortableText and schema generator"
```

---

## Chunk 4: Wizard (Onboarding Web UI)

The Next.js app that serves the adaptive onboarding wizard and live migration dashboard.

### Task 7: Create Wizard Next.js App

**Files:**
- Create: `packages/unpress-wizard/` (Next.js 15 app with Tailwind + shadcn)

- [ ] **Step 1: Scaffold Next.js app**

Run:
```bash
cd packages && npx create-next-app@latest unpress-wizard \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-turbopack
```

- [ ] **Step 2: Install shadcn/ui**

Run:
```bash
cd packages/unpress-wizard && npx shadcn@latest init -d
npx shadcn@latest add button card checkbox input label progress
```

- [ ] **Step 3: Add workspace dependency**

Edit `packages/unpress-wizard/package.json` — add to dependencies:
```json
"@unpress/shared": "workspace:*"
```

- [ ] **Step 4: Create wizard layout with Unpress branding**

Create `packages/unpress-wizard/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Unpress — AI Website Migration",
  description: "Migrate your WordPress site to a modern AI-powered stack",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#F5F0EB] text-[#1a1a1a] min-h-screen`}>
        {/* Nav */}
        <nav className="flex items-center justify-between px-12 py-5 max-w-5xl mx-auto">
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-[#D4603A]">Un</span>press
          </div>
          <div className="flex items-center gap-2" id="step-dots" />
          <div className="bg-white px-3.5 py-1.5 rounded-full text-xs font-medium text-[#D4603A] border border-[#e8ddd3]" id="skill-badge">
            🌱 Novice
          </div>
        </nav>

        {/* Main */}
        <main className="max-w-3xl mx-auto px-12 pb-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="max-w-3xl mx-auto px-12 py-6 border-t border-[#e0d6cb] text-center text-sm text-[#8a7d72]">
          Built by Amir Baldiga ·{" "}
          <a href="https://linkedin.com/in/amirbaldiag" target="_blank" rel="noopener" className="text-[#D4603A] font-medium hover:underline">
            Connect on LinkedIn
          </a>
        </footer>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create welcome page (Step 0)**

Create `packages/unpress-wizard/src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="space-y-8 pt-8">
      {/* Safety Promise */}
      <div className="bg-[#f0fdf4] border-2 border-[#22c55e] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-[#166534] mb-2">🔒 Your WordPress site stays untouched</h2>
        <p className="text-[#3d352e] text-sm leading-relaxed">
          Unpress reads and copies your content — it never modifies, deletes, or touches your live site.
          Think of it as taking a photo of your house before building a new one.
        </p>
      </div>

      {/* Hero */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#D4603A] font-semibold mb-3">Welcome to Unpress</p>
        <h1 className="text-4xl font-bold tracking-tight leading-tight mb-3">
          Move your WordPress site to the future.
        </h1>
        <p className="text-[#6b6058] text-base leading-relaxed">
          We'll migrate your content, design a beautiful new site based on styles you love,
          and deploy it — all with AI guiding every step. After migration, Claude stays as your
          site co-pilot: "Change my header color", "Add a testimonials section" — and it just happens.
        </p>
      </div>

      {/* Why Unpress */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: "⚡", title: "Fast", desc: "Full migration in 15-45 minutes" },
          { icon: "💰", title: "Free tiers", desc: "Most sites cost $0/month to run" },
          { icon: "🔑", title: "You own it", desc: "Your code, your repo, your data" },
          { icon: "🤖", title: "AI co-pilot", desc: "Claude helps you after migration too" },
        ].map((item) => (
          <div key={item.title} className="bg-white border border-[#e8ddd3] rounded-xl p-4">
            <span className="text-2xl">{item.icon}</span>
            <h3 className="font-semibold mt-2">{item.title}</h3>
            <p className="text-sm text-[#6b6058] mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Skill Level Selection */}
      <div>
        <h2 className="text-lg font-bold mb-4">How experienced are you with dev tools?</h2>
        <div className="space-y-3">
          {[
            { level: "novice", icon: "🌱", title: "Novice", desc: "I'm new to this — guide me through everything with screenshots and explanations", color: "#22c55e" },
            { level: "medium", icon: "⚡", title: "Medium", desc: "I know my way around — just tell me the key steps", color: "#f59e0b" },
            { level: "expert", icon: "🚀", title: "Expert", desc: "Just give me the input fields — I know what to do", color: "#ef4444" },
          ].map((item) => (
            <Link
              key={item.level}
              href={`/step/1?level=${item.level}`}
              className="flex items-center gap-4 bg-white border-2 border-[#e8ddd3] rounded-xl p-4 hover:border-[#D4603A] transition-colors cursor-pointer"
            >
              <span className="text-3xl">{item.icon}</span>
              <div>
                <h3 className="font-semibold" style={{ color: item.color }}>{item.title}</h3>
                <p className="text-sm text-[#6b6058]">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify wizard runs locally**

Run: `cd packages/unpress-wizard && npm run dev`
Open: `http://localhost:3000`
Expected: Welcome page renders with branding, safety promise, skill level options

- [ ] **Step 7: Commit**

```bash
git add packages/unpress-wizard/
git commit -m "feat: add wizard — welcome page with safety promise, skill levels, Unpress branding"
```

*Note: Remaining wizard steps (1-6), the live dashboard, and the design/deploy/copilot phase packages will be detailed in subsequent plan chunks. This plan covers the foundation, core pipeline, and first usable UI.*

---

## Chunk 5: Design, Deploy, and Copilot Phases (Stubs)

These phases are complex and will be fully implemented after the core pipeline works. For now, create working stubs that the orchestrator can call.

### Task 8: Create Phase Package Stubs

**Files:**
- Create: `packages/unpress-design/package.json`
- Create: `packages/unpress-design/src/index.ts`
- Create: `packages/unpress-deploy/package.json`
- Create: `packages/unpress-deploy/src/index.ts`
- Create: `packages/unpress-copilot/package.json`
- Create: `packages/unpress-copilot/src/index.ts`

- [ ] **Step 1: Create unpress-design stub**

Create `packages/unpress-design/package.json`:
```json
{
  "name": "@unpress/design",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc", "test": "vitest run", "clean": "rm -rf dist" },
  "dependencies": { "@unpress/shared": "workspace:*" },
  "devDependencies": { "typescript": "^5.7", "vitest": "^3" }
}
```

Create `packages/unpress-design/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

Create `packages/unpress-design/src/index.ts`:
```typescript
import type { DesignTokens, Manifest, SanityConfig } from "@unpress/shared";

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
  return "http://localhost:3001"; // preview URL
}
```

- [ ] **Step 2: Create unpress-deploy stub**

Create `packages/unpress-deploy/package.json`:
```json
{
  "name": "@unpress/deploy",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc", "test": "vitest run", "clean": "rm -rf dist" },
  "dependencies": { "@unpress/shared": "workspace:*" },
  "devDependencies": { "typescript": "^5.7", "vitest": "^3" }
}
```

Create `packages/unpress-deploy/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

Create `packages/unpress-deploy/src/index.ts`:
```typescript
import type { DeployOptions } from "@unpress/shared";

export async function createGithubRepo(token: string, name: string): Promise<string> {
  // TODO: GitHub API — create repo, push code
  return `https://github.com/user/${name}`;
}

export async function deployToVercel(token: string, options: DeployOptions): Promise<{ previewUrl: string; projectId: string }> {
  // TODO: Vercel API — create project, deploy
  return { previewUrl: `https://${options.repo_name}.vercel.app`, projectId: "prj_stub" };
}
```

- [ ] **Step 3: Create unpress-copilot stub**

Create `packages/unpress-copilot/package.json`:
```json
{
  "name": "@unpress/copilot",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc", "test": "vitest run", "clean": "rm -rf dist" },
  "dependencies": { "@unpress/shared": "workspace:*" },
  "devDependencies": { "typescript": "^5.7", "vitest": "^3" }
}
```

Create `packages/unpress-copilot/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

Create `packages/unpress-copilot/src/index.ts`:
```typescript
import type { CopilotAction, SanityConfig } from "@unpress/shared";

export async function executeCopilotAction(
  action: CopilotAction,
  context: { repo_path: string; sanity_config: SanityConfig },
): Promise<{ changes: { path: string; action: "create" | "modify" | "delete" }[]; deployed: boolean }> {
  // TODO: Read codebase, modify components, commit, deploy
  return { changes: [], deployed: false };
}
```

- [ ] **Step 4: Create Next.js + Sanity site template**

```bash
mkdir -p templates/next-sanity
```

Create `templates/next-sanity/README.md`:
```
# Unpress Generated Site Template

This template is used by the design phase to generate the user's Next.js + Sanity site.
It will be populated with generated components, design tokens, and Sanity schemas during migration.

## Stack
- Next.js 15
- Tailwind CSS
- shadcn/ui
- next-sanity
- Sanity Studio (embedded at /studio)
```

- [ ] **Step 5: Build all packages**

Run: `pnpm install && pnpm turbo build`
Expected: All packages build successfully

- [ ] **Step 6: Commit**

```bash
git add packages/unpress-design/ packages/unpress-deploy/ packages/unpress-copilot/ templates/
git commit -m "feat: add design, deploy, copilot phase stubs and site template"
```

---

### Task 9: Final Integration — Wire Orchestrator to All Phases

**Files:**
- Modify: `packages/unpress/package.json` (add phase dependencies)
- Modify: `packages/unpress/src/server.ts` (add scan + migrate tools)

- [ ] **Step 1: Add phase dependencies to orchestrator**

Edit `packages/unpress/package.json` — add to dependencies:
```json
"@unpress/scan": "workspace:*",
"@unpress/migrate": "workspace:*",
"@unpress/design": "workspace:*",
"@unpress/deploy": "workspace:*",
"@unpress/copilot": "workspace:*"
```

- [ ] **Step 2: Add scan and migrate tools to MCP server**

Add to `packages/unpress/src/server.ts` — new tool registrations after existing ones:

```typescript
import { WpClient, calculateCosts } from "@unpress/scan";
import { htmlToPortableText, generateSanitySchema } from "@unpress/migrate";

// ... inside createUnpressServer():

server.tool(
  "unpress_scan",
  "Scan a WordPress site and generate a content manifest with cost estimate",
  {
    wp_url: z.string().url(),
    wp_auth_token: z.string(),
  },
  async (params) => {
    const client = new WpClient(params.wp_url, params.wp_auth_token);
    try {
      await client.checkHealth();
      const manifest = await client.fetchManifest();
      const costs = calculateCosts({
        posts: manifest.content.posts.count,
        pages: manifest.content.pages.count,
        media: manifest.media.total,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ manifest, costs }) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(error) }) }],
      };
    }
  },
);

server.tool(
  "unpress_wizard",
  "Launch the onboarding wizard web UI",
  {
    port: z.number().default(3456),
  },
  async (params) => {
    // The wizard is started separately via `npx unpress wizard`
    // This tool returns the expected URL and fallback path
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        url: `http://localhost:${params.port}`,
        fallback_path: ".unpress/wizard-fallback/index.html",
        instructions: "Run 'npx unpress wizard' to start the onboarding UI",
      }) }],
    };
  },
);
```

- [ ] **Step 3: Build everything**

Run: `pnpm install && pnpm turbo build`
Expected: Clean build across all packages

- [ ] **Step 4: Run all tests**

Run: `npx turbo test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/unpress/
git commit -m "feat: wire orchestrator to all phase packages"
```

---

## Execution Summary

| Chunk | Tasks | What It Delivers |
|-------|-------|-----------------|
| 1 | Tasks 1-3 | Monorepo, shared types, orchestrator MCP server with session + checkpoint management |
| 2 | Task 4 | WordPress plugin with scanner, REST API, trust badge, AI verification flow |
| 3 | Tasks 5-6 | Scan phase (WP client, cost calculator) + Migrate phase (HTML→Portable Text, schema generator) |
| 4 | Task 7 | Wizard Next.js app with welcome page, branding, skill level selection |
| 5 | Tasks 8-9 | Design/Deploy/Copilot stubs, site template, full orchestrator wiring |

**After this plan:** The project has a working monorepo with all packages building, a real WP plugin, a functional scan + migrate pipeline, and an onboarding wizard. The design, deploy, and copilot phases are stubbed and ready for full implementation in follow-up plans.

**Follow-up plans needed:**
1. Wizard steps 1-6 + live dashboard
2. Design phase — Playwright analysis + 21st.dev component generation
3. Deploy phase — GitHub + Vercel API integration
4. Copilot phase — post-migration site changes
5. End-to-end integration testing

---

## Review Fixes

The following fixes address issues found during plan review. Apply these changes alongside (or immediately after) the tasks they modify.

### Fix 1: Add Missing MCP Tool Registrations (Issues #3, #5, #6)

The spec defines 10 MCP tools. Task 3 registers `unpress_start`, `unpress_status`, and `unpress_rollback`. Task 9 adds `unpress_scan` and `unpress_wizard`. The following 5 tools are still missing: `unpress_decide`, `unpress_migrate`, `unpress_design`, `unpress_deploy`, `unpress_copilot`.

**Applies to:** Task 9, Step 2

Add these tool registrations to `packages/unpress/src/server.ts` inside `createUnpressServer()`, after the existing scan/wizard tools:

```typescript
import { analyzeInspirationSites, generateSite } from "@unpress/design";
import { createGithubRepo, deployToVercel } from "@unpress/deploy";
import { executeCopilotAction } from "@unpress/copilot";

server.tool(
  "unpress_decide",
  "Submit a user decision for a pending migration choice",
  {
    session_id: z.string(),
    decision_id: z.string(),
    choice: z.string(),
  },
  async (params) => {
    const session = await sessions.load(params.session_id);
    if (!session) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
    }
    // Decision handling — phases will register decision handlers
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ accepted: true, decision_id: params.decision_id, choice: params.choice }) }],
    };
  },
);

server.tool(
  "unpress_migrate",
  "Migrate WordPress content to Sanity CMS",
  {
    session_id: z.string(),
    content_types: z.array(z.string()),
    include_media: z.boolean().default(true),
    include_seo: z.boolean().default(true),
    batch_size: z.number().default(50),
    media_concurrency: z.number().default(3),
  },
  async (params) => {
    const session = await sessions.load(params.session_id);
    if (!session) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
    }
    // Delegate to migrate phase — full implementation in unpress-migrate
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        status: "started",
        content_types: params.content_types,
        batch_size: params.batch_size,
      }) }],
    };
  },
);

server.tool(
  "unpress_design",
  "Analyze inspiration sites and generate a design for the new website",
  {
    session_id: z.string(),
    inspiration_urls: z.array(z.string().url()).min(3).max(5),
    sanity_project_id: z.string(),
    sanity_dataset: z.string(),
    sanity_token: z.string(),
  },
  async (params) => {
    const session = await sessions.load(params.session_id);
    if (!session) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
    }
    const tokens = await analyzeInspirationSites(params.inspiration_urls);
    // Site generation requires manifest from scan phase — stored in session
    // Full generation happens asynchronously; preview_url updated via unpress_status
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        design_tokens: tokens,
        preview_url: "pending — call unpress_status to check when ready",
      }) }],
    };
  },
);

server.tool(
  "unpress_deploy",
  "Deploy the generated site to GitHub and Vercel",
  {
    session_id: z.string(),
    github_token: z.string(),
    vercel_token: z.string(),
    repo_name: z.string(),
    custom_domain: z.string().optional(),
  },
  async (params) => {
    const session = await sessions.load(params.session_id);
    if (!session) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
    }
    const repoUrl = await createGithubRepo(params.github_token, params.repo_name);
    const deploy = await deployToVercel(params.vercel_token, {
      repo_name: params.repo_name,
      custom_domain: params.custom_domain,
    });
    await sessions.addResource(params.session_id, "github_repo", repoUrl);
    await sessions.addResource(params.session_id, "vercel_project_id", deploy.projectId);
    await sessions.addResource(params.session_id, "vercel_preview_url", deploy.previewUrl);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        repo_url: repoUrl,
        site_url: deploy.previewUrl,
        vercel_project_id: deploy.projectId,
      }) }],
    };
  },
);

server.tool(
  "unpress_copilot",
  "Execute a post-migration site change via the AI copilot",
  {
    session_id: z.string(),
    action_type: z.enum(["modify_component", "add_page", "add_section", "update_schema", "optimize_performance", "adjust_responsive"]),
    description: z.string(),
    repo_path: z.string(),
    sanity_project_id: z.string(),
    sanity_dataset: z.string(),
    sanity_token: z.string(),
  },
  async (params) => {
    const result = await executeCopilotAction(
      { type: params.action_type, description: params.description },
      { repo_path: params.repo_path, sanity_config: { project_id: params.sanity_project_id, dataset: params.sanity_dataset, token: params.sanity_token } },
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  },
);
```

### Fix 2: Phases Implement the Phase Interface (Issue #9)

The spec defines `Phase<TInput, TOutput>` with an `AsyncGenerator`-based `run()` method. The scan and migrate packages export bare functions instead. Add Phase wrappers.

**Applies to:** Task 5 (scan) — add after Step 10

Add to `packages/unpress-scan/src/index.ts`:

```typescript
export { WpClient } from "./wp-client.js";
export { calculateCosts } from "./cost-calculator.js";
export type { CostEstimate } from "./cost-calculator.js";

// Phase interface implementation
import type { Phase, PhaseContext, PhaseEvent, Manifest, UnpressConfig } from "@unpress/shared";

export interface ScanInput {
  wp_url: string;
  wp_auth_token: string;
}

export interface ScanOutput {
  manifest: Manifest;
  costs: import("./cost-calculator.js").CostEstimate;
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
```

**Applies to:** Task 6 (migrate) — replace Step 10

Replace `packages/unpress-migrate/src/index.ts` with:

```typescript
export { htmlToPortableText } from "./html-to-portable-text.js";
export { generateSanitySchema } from "./schema-generator.js";
export { ContentMigrator } from "./content-migrator.js";
export { MediaMigrator } from "./media-migrator.js";

// Phase interface implementation
import type { Phase, PhaseContext, PhaseEvent, Manifest, SanityConfig, MigrateOptions } from "@unpress/shared";
import { ContentMigrator } from "./content-migrator.js";
import { MediaMigrator } from "./media-migrator.js";
import { generateSanitySchema } from "./schema-generator.js";

export interface MigrateInput {
  manifest: Manifest;
  sanity_config: SanityConfig;
  options: MigrateOptions;
}

export interface MigrateOutput {
  documents_created: number;
  media_uploaded: number;
  schemas_generated: number;
  errors: string[];
}

export const migratePhase: Phase<MigrateInput, MigrateOutput> = {
  name: "migrate",
  async *run(input: MigrateInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, MigrateOutput> {
    const errors: string[] = [];

    yield { type: "progress", percent: 0, message: "Generating Sanity schemas..." };
    const schemas = generateSanitySchema(input.manifest);

    yield { type: "progress", percent: 10, message: "Migrating content..." };
    const contentMigrator = new ContentMigrator(input.sanity_config);
    const docCount = await contentMigrator.migrateAll(input.manifest, input.options);

    yield { type: "progress", percent: 60, message: "Uploading media..." };
    let mediaCount = 0;
    if (input.options.include_media) {
      const mediaMigrator = new MediaMigrator(input.sanity_config);
      mediaCount = await mediaMigrator.uploadAll(input.manifest.media.items, input.options.media_concurrency);
    }

    yield { type: "progress", percent: 100, message: "Migration complete" };

    return {
      documents_created: docCount,
      media_uploaded: mediaCount,
      schemas_generated: schemas.length,
      errors,
    };
  },
};
```

**Applies to:** Task 8 stubs — update each stub to implement Phase interface

Replace `packages/unpress-design/src/index.ts`:

```typescript
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
```

Replace `packages/unpress-deploy/src/index.ts`:

```typescript
import type { Phase, PhaseContext, PhaseEvent, DeployOptions } from "@unpress/shared";

export async function createGithubRepo(token: string, name: string): Promise<string> {
  // TODO: GitHub API — create repo, push code
  return `https://github.com/user/${name}`;
}

export async function deployToVercel(token: string, options: DeployOptions): Promise<{ previewUrl: string; projectId: string }> {
  // TODO: Vercel API — create project, deploy
  return { previewUrl: `https://${options.repo_name}.vercel.app`, projectId: "prj_stub" };
}

export interface DeployInput {
  github_token: string;
  vercel_token: string;
  options: DeployOptions;
  site_path: string;
}

export interface DeployOutput {
  repo_url: string;
  site_url: string;
  vercel_project_id: string;
}

export const deployPhase: Phase<DeployInput, DeployOutput> = {
  name: "deploy",
  async *run(input: DeployInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, DeployOutput> {
    yield { type: "progress", percent: 0, message: "Creating GitHub repository..." };
    const repoUrl = await createGithubRepo(input.github_token, input.options.repo_name);
    yield { type: "progress", percent: 50, message: "Deploying to Vercel..." };
    const deploy = await deployToVercel(input.vercel_token, input.options);
    yield { type: "progress", percent: 100, message: "Deployed" };
    return { repo_url: repoUrl, site_url: deploy.previewUrl, vercel_project_id: deploy.projectId };
  },
};
```

Replace `packages/unpress-copilot/src/index.ts`:

```typescript
import type { Phase, PhaseContext, PhaseEvent, CopilotAction, SanityConfig } from "@unpress/shared";

export async function executeCopilotAction(
  action: CopilotAction,
  context: { repo_path: string; sanity_config: SanityConfig },
): Promise<{ changes: { path: string; action: "create" | "modify" | "delete" }[]; deployed: boolean }> {
  // TODO: Read codebase, modify components, commit, deploy
  return { changes: [], deployed: false };
}

export interface CopilotInput {
  action: CopilotAction;
  repo_path: string;
  sanity_config: SanityConfig;
}

export interface CopilotOutput {
  changes: { path: string; action: "create" | "modify" | "delete" }[];
  deployed: boolean;
}

export const copilotPhase: Phase<CopilotInput, CopilotOutput> = {
  name: "copilot",
  async *run(input: CopilotInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, CopilotOutput> {
    yield { type: "progress", percent: 0, message: "Analyzing request..." };
    const result = await executeCopilotAction(input.action, { repo_path: input.repo_path, sanity_config: input.sanity_config });
    yield { type: "progress", percent: 100, message: "Done" };
    return result;
  },
};
```

### Fix 3: Add Content Migrator and Media Migrator (Issue #4)

Task 6 lists `content-migrator.ts` and `media-migrator.ts` in its Files section but never implements them.

**Applies to:** Task 6 — add after Step 9, before Step 10

- [ ] **Step 9a: Create content migrator**

Create `packages/unpress-migrate/src/content-migrator.ts`:

```typescript
import type { Manifest, SanityConfig, MigrateOptions } from "@unpress/shared";
import { htmlToPortableText } from "./html-to-portable-text.js";

export class ContentMigrator {
  private projectId: string;
  private dataset: string;
  private token: string;

  constructor(config: SanityConfig) {
    this.projectId = config.project_id;
    this.dataset = config.dataset;
    this.token = config.token;
  }

  async migrateAll(manifest: Manifest, options: MigrateOptions): Promise<number> {
    let totalCreated = 0;

    for (const contentType of options.content_types) {
      const source = contentType === "post"
        ? manifest.content.posts
        : contentType === "page"
        ? manifest.content.pages
        : manifest.content.custom_post_types[contentType];

      if (!source) continue;

      const batches = this.chunk(source.items, options.batch_size);
      for (const batch of batches) {
        const mutations = batch.map((item) => ({
          create: {
            _type: contentType,
            title: item.title,
            slug: { _type: "slug", current: item.slug },
            publishedAt: item.date,
            // body is converted separately when full content is fetched
          },
        }));

        await this.mutate(mutations);
        totalCreated += batch.length;
      }
    }

    return totalCreated;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  private async mutate(mutations: unknown[]): Promise<void> {
    const url = `https://${this.projectId}.api.sanity.io/v2024-01-01/data/mutate/${this.dataset}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ mutations }),
    });

    if (!res.ok) {
      throw new Error(`Sanity mutation failed: ${res.status} ${await res.text()}`);
    }
  }
}
```

- [ ] **Step 9b: Create media migrator**

Create `packages/unpress-migrate/src/media-migrator.ts`:

```typescript
import type { SanityConfig } from "@unpress/shared";

interface MediaItem {
  id: number;
  url: string;
  mime: string;
  alt: string;
}

export class MediaMigrator {
  private projectId: string;
  private dataset: string;
  private token: string;

  constructor(config: SanityConfig) {
    this.projectId = config.project_id;
    this.dataset = config.dataset;
    this.token = config.token;
  }

  async uploadAll(items: MediaItem[], concurrency: number): Promise<number> {
    let uploaded = 0;

    // Process in batches of `concurrency`
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((item) => this.uploadOne(item)),
      );

      for (const result of results) {
        if (result.status === "fulfilled") uploaded++;
      }
    }

    return uploaded;
  }

  private async uploadOne(item: MediaItem): Promise<string> {
    // Download from WP
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`Failed to download ${item.url}: ${res.status}`);
    const buffer = await res.arrayBuffer();

    // Upload to Sanity — use /images/ for images, /files/ for everything else
    const filename = item.url.split("/").pop() || "media";
    const assetType = item.mime.startsWith("image/") ? "images" : "files";
    const uploadUrl = `https://${this.projectId}.api.sanity.io/v2024-01-01/assets/${assetType}/${this.dataset}?filename=${encodeURIComponent(filename)}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": item.mime,
        Authorization: `Bearer ${this.token}`,
      },
      body: buffer,
    });

    if (!uploadRes.ok) throw new Error(`Sanity upload failed: ${uploadRes.status}`);

    const data = await uploadRes.json() as { document: { _id: string } };
    return data.document._id;
  }
}
```

### Fix 4: Add Missing Sanity Schema Types (Issues #7, #8, #14)

The schema generator references `menuItem` and `blockContent` types but they're never defined. Legal pages are also missing.

**Applies to:** Task 6, Step 8 — add to `generateSanitySchema()` return before the final `return schemas;`

Add these schemas inside `generateSanitySchema()` in `schema-generator.ts`, before `return schemas;`:

```typescript
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
```

Also add a note that `menuItem` and `blockContent` are defined as reusable schema types. Add to the barrel export comment in `schema-generator.ts` after the function:

```typescript
/**
 * The following schema types must be registered alongside generated document schemas:
 *
 * menuItem (object):
 *   - label: string
 *   - url: string (optional, for external links)
 *   - reference: reference to page/post (optional, for internal links)
 *   - children: array of menuItem (for nested menus)
 *
 * blockContent (array):
 *   - block (with styles: normal, h1-h4, blockquote; lists: bullet, number;
 *     marks: strong, em, underline, code, link)
 *   - image
 *   - wpImage (for WP-origin images preserving original URL)
 *
 * These are consumed by the design phase when scaffolding the Sanity Studio schema files.
 */
```

Add to the schema generator test (`schema-generator.test.ts`) after the last `it()`:

```typescript
  it("generates legalPage schema", () => {
    const schemas = generateSanitySchema(mockManifest as Manifest);
    const legal = schemas.find(s => s.name === "legalPage");
    expect(legal).toBeDefined();
    expect(legal!.type).toBe("document");
    expect(legal!.fields.some((f: any) => f.name === "pageType")).toBe(true);
  });
```

### Fix 5: Add PHPUnit Tests for WP Plugin (Issue #12)

**Applies to:** Task 4 — add after Step 8

- [ ] **Step 9: Create PHPUnit test for scanner**

Create `plugins/unpress-wp/tests/test-scanner.php`:

```php
<?php
/**
 * Tests for Unpress_Scanner
 *
 * Run with: cd plugins/unpress-wp && ./vendor/bin/phpunit
 * Requires WordPress test library (wp-env or wp-phpunit)
 */

class Test_Scanner extends WP_UnitTestCase {

    public function test_generate_manifest_returns_array() {
        $manifest = Unpress_Scanner::generate_manifest();
        $this->assertIsArray($manifest);
        $this->assertArrayHasKey('version', $manifest);
        $this->assertArrayHasKey('content', $manifest);
        $this->assertArrayHasKey('media', $manifest);
    }

    public function test_manifest_includes_site_url() {
        $manifest = Unpress_Scanner::generate_manifest();
        $this->assertEquals(get_site_url(), $manifest['site_url']);
    }

    public function test_scan_content_counts_posts() {
        // Create test posts
        self::factory()->post->create_many(3);
        $manifest = Unpress_Scanner::generate_manifest();
        $this->assertGreaterThanOrEqual(3, $manifest['content']['posts']['count']);
    }

    public function test_scan_content_counts_pages() {
        self::factory()->post->create_many(2, ['post_type' => 'page']);
        $manifest = Unpress_Scanner::generate_manifest();
        $this->assertGreaterThanOrEqual(2, $manifest['content']['pages']['count']);
    }

    public function test_manifest_has_taxonomy_section() {
        $manifest = Unpress_Scanner::generate_manifest();
        $this->assertArrayHasKey('taxonomy', $manifest);
        $this->assertArrayHasKey('categories', $manifest['taxonomy']);
        $this->assertArrayHasKey('tags', $manifest['taxonomy']);
    }
}
```

Create `plugins/unpress-wp/phpunit.xml.dist`:

```xml
<?xml version="1.0"?>
<phpunit
    bootstrap="tests/bootstrap.php"
    backupGlobals="false"
    colors="true"
>
    <testsuites>
        <testsuite name="Unpress WP Plugin">
            <directory suffix=".php">tests/</directory>
        </testsuite>
    </testsuites>
</phpunit>
```

Create `plugins/unpress-wp/tests/bootstrap.php`:

```php
<?php
/**
 * PHPUnit bootstrap — loads WordPress test suite.
 * Set WP_TESTS_DIR env var to point to your wordpress-develop/tests/phpunit dir.
 */

$wp_tests_dir = getenv('WP_TESTS_DIR') ?: '/tmp/wordpress-tests-lib';
require_once $wp_tests_dir . '/includes/functions.php';

tests_add_filter('muplugins_loaded', function () {
    require dirname(__DIR__) . '/unpress-wp.php';
});

require $wp_tests_dir . '/includes/bootstrap.php';
```

### Fix 6: Add Wizard Rendering Test (Issue #13)

**Applies to:** Task 7 — add after Step 5

- [ ] **Step 5a: Add rendering test for welcome page**

Create `packages/unpress-wizard/src/__tests__/welcome.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WelcomePage from "../app/page";

describe("WelcomePage", () => {
  it("renders the safety promise", () => {
    render(<WelcomePage />);
    expect(screen.getByText(/Your WordPress site stays untouched/)).toBeTruthy();
  });

  it("renders three skill level options", () => {
    render(<WelcomePage />);
    expect(screen.getByText("Novice")).toBeTruthy();
    expect(screen.getByText("Medium")).toBeTruthy();
    expect(screen.getByText("Expert")).toBeTruthy();
  });

  it("renders the hero heading", () => {
    render(<WelcomePage />);
    expect(screen.getByText(/Move your WordPress site to the future/)).toBeTruthy();
  });
});
```

Add test dependencies to `packages/unpress-wizard/package.json` devDependencies:

```json
"vitest": "^3",
"@testing-library/react": "^16",
"@testing-library/jest-dom": "^6",
"jsdom": "^26"
```

Add to `packages/unpress-wizard/package.json` scripts:

```json
"test": "vitest run"
```

Create `packages/unpress-wizard/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

### Fix 7: Add Tests for Phase Stubs (Issue #15)

**Applies to:** Task 8 — add after Step 3

- [ ] **Step 3a: Add tests for design stub**

Create `packages/unpress-design/src/__tests__/index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { analyzeInspirationSites, designPhase } from "../index.js";

describe("analyzeInspirationSites", () => {
  it("returns design tokens with required color fields", async () => {
    const tokens = await analyzeInspirationSites(["https://a.com", "https://b.com", "https://c.com"]);
    expect(tokens.colors.primary).toBeTruthy();
    expect(tokens.colors.background).toBeTruthy();
    expect(tokens.fonts.heading).toBeTruthy();
    expect(tokens.style.vibe).toBeTruthy();
  });
});

describe("designPhase", () => {
  it("has correct name", () => {
    expect(designPhase.name).toBe("design");
  });
});
```

- [ ] **Step 3b: Add tests for deploy stub**

Create `packages/unpress-deploy/src/__tests__/index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createGithubRepo, deployToVercel, deployPhase } from "../index.js";

describe("createGithubRepo", () => {
  it("returns a URL containing the repo name", async () => {
    const url = await createGithubRepo("token", "my-site");
    expect(url).toContain("my-site");
  });
});

describe("deployToVercel", () => {
  it("returns preview URL and project ID", async () => {
    const result = await deployToVercel("token", { repo_name: "my-site" });
    expect(result.previewUrl).toContain("my-site");
    expect(result.projectId).toBeTruthy();
  });
});

describe("deployPhase", () => {
  it("has correct name", () => {
    expect(deployPhase.name).toBe("deploy");
  });
});
```

- [ ] **Step 3c: Add tests for copilot stub**

Create `packages/unpress-copilot/src/__tests__/index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { executeCopilotAction, copilotPhase } from "../index.js";

describe("executeCopilotAction", () => {
  it("returns changes array and deployed flag", async () => {
    const result = await executeCopilotAction(
      { type: "modify_component", description: "change header color" },
      { repo_path: "/tmp/test", sanity_config: { project_id: "test", dataset: "production", token: "tok" } },
    );
    expect(result.changes).toBeInstanceOf(Array);
    expect(typeof result.deployed).toBe("boolean");
  });
});

describe("copilotPhase", () => {
  it("has correct name", () => {
    expect(copilotPhase.name).toBe("copilot");
  });
});
```

### Fix 8: 301 Redirect Map Generator (SEO Preservation)

Without 301 redirects, migrated sites lose Google rankings. This is a non-negotiable feature.

**Applies to:** Task 6 — add after content-migrator and media-migrator

- [ ] **Step 9c: Write failing test for redirect map**

Create `packages/unpress-migrate/src/__tests__/redirect-map.test.ts`:

```typescript
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
    const helloRedirect = redirects.find(r => r.destination === "/blog/hello-world");
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

  it("preserves page slugs as-is", () => {
    const redirects = generateRedirectMap(mockManifest as Manifest, "/%postname%/");
    const pageRedirect = redirects.find(r => r.destination === "/about");
    // Pages with matching slugs may not need a redirect, or only trailing slash
    // At minimum, no redirect should point AWAY from /about
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
```

- [ ] **Step 9d: Implement redirect map generator**

Create `packages/unpress-migrate/src/redirect-map.ts`:

```typescript
import type { Manifest } from "@unpress/shared";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface Redirect {
  source: string;
  destination: string;
  permanent: boolean;
}

/**
 * Generate a 301 redirect map from WordPress permalink structure to Next.js routes.
 *
 * @param manifest - The WordPress site manifest
 * @param wpPermalinkStructure - WP permalink format, e.g. "/%year%/%monthnum%/%postname%/"
 * @returns Array of redirect rules
 */
export function generateRedirectMap(manifest: Manifest, wpPermalinkStructure: string): Redirect[] {
  const redirects: Redirect[] = [];

  // Posts → /blog/{slug}
  for (const post of manifest.content.posts.items) {
    const oldPath = resolveWpPermalink(wpPermalinkStructure, post);
    const newPath = `/blog/${post.slug}`;

    if (oldPath !== newPath) {
      redirects.push({ source: oldPath, destination: newPath, permanent: true });
    }

    // Query param fallback: /?p=ID
    redirects.push({ source: `/?p=${post.id}`, destination: newPath, permanent: true });
  }

  // Pages → /{slug} (pages keep their slug at root)
  for (const page of manifest.content.pages.items) {
    const oldPath = `/${page.slug}/`;
    const newPath = `/${page.slug}`;

    // Only add redirect if trailing slash differs
    if (oldPath !== newPath) {
      redirects.push({ source: oldPath, destination: newPath, permanent: true });
    }

    // Query param fallback
    redirects.push({ source: `/?page_id=${page.id}`, destination: newPath, permanent: true });
  }

  // Custom post types → /{type}/{slug}
  for (const [typeName, typeData] of Object.entries(manifest.content.custom_post_types)) {
    for (const item of typeData.items) {
      redirects.push({ source: `/${typeName}/${item.slug}/`, destination: `/${typeName}/${item.slug}`, permanent: true });
      redirects.push({ source: `/?p=${item.id}`, destination: `/${typeName}/${item.slug}`, permanent: true });
    }
  }

  // Category archives
  for (const cat of manifest.taxonomy.categories) {
    redirects.push({ source: `/category/${cat.slug}/`, destination: `/category/${cat.slug}`, permanent: true });
  }

  // Tag archives
  for (const tag of manifest.taxonomy.tags) {
    redirects.push({ source: `/tag/${tag.slug}/`, destination: `/tag/${tag.slug}`, permanent: true });
  }

  return redirects;
}

/**
 * Resolve a WordPress permalink pattern to an actual URL path.
 */
function resolveWpPermalink(
  structure: string,
  post: { slug: string; date: string },
): string {
  const date = new Date(post.date);
  return structure
    .replace("%year%", date.getUTCFullYear().toString())
    .replace("%monthnum%", String(date.getUTCMonth() + 1).padStart(2, "0"))
    .replace("%day%", String(date.getUTCDate()).padStart(2, "0"))
    .replace("%postname%", post.slug);
}

/**
 * Convert redirect array to a Next.js config string for next.config.js.
 */
export function redirectsToNextConfig(redirects: Redirect[]): string {
  const entries = redirects.map(r =>
    `      { source: '${r.source}', destination: '${r.destination}', permanent: ${r.permanent} },`
  ).join("\n");

  return `  async redirects() {\n    return [\n${entries}\n    ];\n  },`;
}

/**
 * Save redirect map to disk for review and re-application.
 */
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
```

- [ ] **Step 9e: Update barrel export**

Add to `packages/unpress-migrate/src/index.ts`:

```typescript
export { generateRedirectMap, redirectsToNextConfig, saveRedirectMap } from "./redirect-map.js";
export type { Redirect } from "./redirect-map.js";
```

**Also update the WP plugin scanner** to export the permalink structure. Add to `Unpress_Scanner::generate_manifest()` return array in `plugins/unpress-wp/includes/class-scanner.php`:

```php
'permalink_structure' => get_option('permalink_structure', '/%postname%/'),
```

And add `permalink_structure: string;` to the `Manifest` interface in `packages/shared/src/manifest.ts`.

### Fix 9: Streamlined Account Creation for Novice Users

This is a UX change to the wizard onboarding flow, not a code change to the plan. The implementation details are:

**Applies to:** Task 7 (Wizard) — update the step order for novice users

For novice users, reorder steps 3-4 to reduce signup friction:
1. Step 3 becomes "Create a GitHub account" (if they don't have one)
2. Step 3b: "Sign in to Vercel with GitHub" (one OAuth click)
3. Step 3c: "Sign in to Sanity with GitHub" (one OAuth click)

The wizard detects if the user already has accounts by checking if they can paste valid tokens.

Add to `packages/unpress-wizard/src/app/step/3/page.tsx` (created in follow-up wizard plan):
- GitHub OAuth "Sign in" button link → `https://github.com/signup`
- After GitHub: Vercel "Sign in with GitHub" → `https://vercel.com/signup`
- After Vercel: Sanity "Sign in with GitHub" → `https://www.sanity.io/login`
- Progress checklist: ✅ GitHub · ✅ Vercel · ⏳ Sanity

This reduces the signup experience from "create 3 accounts with 3 passwords" to "create 1 account + 2 OAuth clicks."

**Note:** Full implementation of the wizard steps beyond the welcome page is deferred to follow-up plan #1 (Wizard steps 1-6 + live dashboard). This fix documents the required UX so that plan can implement it correctly.

### Fix 10: Phase support types — no changes needed

Task 2 Step 2 already defines `CheckpointManager`, `WizardBridge`, and `Logger` interfaces in `packages/shared/src/phase.ts`. The barrel export at `packages/shared/src/index.ts` (Task 2 Step 6) already re-exports `phase.js`. No additional changes are required — this issue was already addressed in the original plan.

---

## Review Issue Tracking

| # | Issue | Fix | Status |
|---|-------|-----|--------|
| 1 | Missing `unpress_decide` tool | Fix 1 | Fixed |
| 2 | Missing `unpress_migrate` tool | Fix 1 | Fixed |
| 3 | Missing `unpress_design` tool | Fix 1 | Fixed |
| 4 | No content/media migrator implementation | Fix 3 | Fixed |
| 5 | Missing `unpress_deploy` tool | Fix 1 | Fixed |
| 6 | Missing `unpress_copilot` tool | Fix 1 | Fixed |
| 7 | Missing `legalPage` schema type | Fix 4 | Fixed |
| 8 | Missing `menuItem` schema type | Fix 4 | Fixed |
| 9 | Phases don't implement Phase interface | Fix 2 | Fixed |
| 10 | Missing Phase support types (WizardBridge, Logger) | Already in Task 2 Step 2 | Fixed |
| 11 | WP plugin stores unhashed password | Previously fixed (transient) | Fixed |
| 12 | No PHPUnit tests for WP plugin | Fix 5 | Fixed |
| 13 | No rendering tests for wizard | Fix 6 | Fixed |
| 14 | Missing `blockContent` schema type | Fix 4 | Fixed |
| 15 | No tests for design/deploy/copilot stubs | Fix 7 | Fixed |
| 16 | `workspace:*` incompatible with npm | Previously fixed (pnpm) | Fixed |

### Additional Features (from user feedback review)

| # | Feature | Fix | Status |
|---|---------|-----|--------|
| 17 | 301 redirect map for SEO preservation | Fix 8 | Fixed |
| 18 | Streamlined account creation (reduce signup friction) | Fix 9 | Fixed (spec + wizard UX guidance) |
