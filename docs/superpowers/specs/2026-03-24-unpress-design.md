# Unpress — Design Specification

> AI-powered WordPress to modern web migration platform via MCP

**Version:** 1.0
**Date:** 2026-03-24
**Author:** Amir Baldiga
**Status:** Draft

---

## 1. Overview

### 1.1 What is Unpress?

Unpress is an open-source MCP (Model Context Protocol) server that enables anyone — from first-time Claude users to seasoned developers — to migrate their WordPress website to an AI-powered, modern web stack: **Next.js + Sanity CMS + Vercel**, with Claude as an ongoing site co-pilot.

### 1.2 Problem Statement

Millions of WordPress sites are stuck on legacy infrastructure — slow, plugin-heavy, expensive to maintain. Moving to a modern headless stack is technically complex and intimidating for non-developers. No existing tool combines content extraction, AI-driven design, and automated deployment into a single guided experience.

### 1.3 Key Differentiators

- **First MCP-orchestrated migration pipeline** — nothing like this exists today
- **Adaptive onboarding** — novice/medium/expert tracks with appropriate detail levels
- **Inspiration-driven design** — user shares 3-5 sites they love, AI generates a cohesive design language
- **100% dynamic content** — every string editable in Sanity, zero hardcoded text
- **Sanity Studio mirrors WP admin** — familiar tabs, field order, sections so WP users feel at home
- **Production-ready from day one** — security, error handling, checkpoints, warm UX

### 1.4 Target Users

The open-source community — anyone who wants to migrate from WordPress to an AI-powered site, even if they started using Claude yesterday. The adaptive onboarding ensures both beginners and experts have a smooth experience.

---

## 2. MCP Tool Definitions

### 2.1 Orchestrator Tools

The main `unpress` MCP server exposes these tools to Claude:

```typescript
// Start/resume the full migration pipeline
unpress_start(config: {
  wp_url: string;
  wp_auth_token: string;
  sanity_project_id: string;
  sanity_dataset: string;
  sanity_token: string;
  github_token: string;
  vercel_token: string;
  inspiration_urls: string[];    // 3-5 URLs
  skill_level: "novice" | "medium" | "expert";
  session_id?: string;           // Resume existing session
}) -> { session_id: string; status: "started" | "resumed"; phase: string; }

// Get current migration status
unpress_status(session_id: string) -> {
  phase: "wizard" | "scan" | "migrate" | "design" | "deploy" | "complete";
  progress: number;              // 0-100
  checkpoint: string;            // Last saved checkpoint ID
  pending_decisions: Decision[]; // Questions waiting for user input
  errors: ErrorLog[];
}

// Respond to a decision prompt
unpress_decide(session_id: string, decision_id: string, choice: string) -> { accepted: boolean; }

// Launch the onboarding wizard UI
unpress_wizard(port?: number) -> { url: string; fallback_path: string; }
```

### 2.2 Phase-Specific Tools

```typescript
// Scan: Read WP manifest (called by orchestrator, not directly by user)
unpress_scan(wp_url: string, auth_token: string) -> Manifest

// Migrate: Transfer content to Sanity
unpress_migrate(manifest: Manifest, sanity_config: SanityConfig, options: {
  content_types: string[];       // User-selected types from scan
  include_media: boolean;
  include_seo: boolean;
  batch_size?: number;           // Default: 50 documents per batch
  media_concurrency?: number;    // Default: 3 parallel downloads
}) -> { migrated: number; skipped: number; errors: MigrationError[]; }

// Design: Analyze inspiration + generate site
unpress_design(inspiration_urls: string[], sanity_config: SanityConfig, manifest: Manifest) -> {
  design_tokens: DesignTokens;
  preview_url: string;           // Local preview
}

// Deploy: Push to GitHub + Vercel
unpress_deploy(github_token: string, vercel_token: string, options: {
  repo_name: string;
  custom_domain?: string;
}) -> { repo_url: string; site_url: string; vercel_project_id: string; }

// Copilot: Post-migration site changes
unpress_copilot(action: {
  type: "modify_component" | "add_page" | "add_section" | "update_schema" | "optimize_performance" | "adjust_responsive";
  description: string;            // Natural language description of what to do
}, context: {
  repo_path: string;
  sanity_config: SanityConfig;
}) -> { changes: { path: string; action: "create" | "modify" | "delete"; diff?: string; }[]; deployed: boolean; commit_sha?: string; }

// Rollback: Undo a migration session
unpress_rollback(session_id: string, targets: {
  sanity: boolean;               // Delete created Sanity documents
  github: boolean;               // Delete created repo
  vercel: boolean;               // Delete Vercel project
}) -> { deleted: { sanity_docs: number; github_repo?: string; vercel_project?: string; }; }
```

### 2.3 Manifest Schema

The core data contract between Scan and Migrate phases:

```typescript
interface Manifest {
  version: "1.0";
  generated_at: string;           // ISO timestamp
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
    items: { id: number; url: string; mime: string; size: number; alt: string; }[];
  };

  taxonomy: {
    categories: { id: number; name: string; slug: string; parent?: number; }[];
    tags: { id: number; name: string; slug: string; }[];
    custom: Record<string, { id: number; name: string; slug: string; }[]>;
  };

  navigation: {
    menus: { name: string; location: string; items: MenuItem[]; }[];
  };

  seo: {
    plugin: "yoast" | "rankmath" | "aioseo" | "none";
    global: { title_template: string; meta_description: string; };
    per_content: Record<number, { title: string; description: string; og_image?: string; }>;
  };

  legal_pages: {
    privacy?: number;             // Page ID
    terms?: number;
    accessibility?: number;
    custom: { name: string; page_id: number; }[];
  };

  tracking: {
    ga_id?: string;
    gtm_id?: string;
    meta_pixel_id?: string;
    custom_scripts: { location: "head" | "body"; code: string; }[];
  };

  sitemap: {
    url?: string;
    entries: { loc: string; lastmod?: string; priority?: number; }[];
  };

  theme: {
    name: string;
    is_block_theme: boolean;
  };

  plugins: {
    active: { slug: string; name: string; version: string; }[];
    page_builder?: "elementor" | "divi" | "wpbakery" | "beaver" | "none";
  };

  acf_fields: Record<string, {
    name: string; type: string; choices?: string[];
  }[]>;

  wp_admin_structure: {
    sidebar_order: string[];      // e.g., ["Posts", "Pages", "Products", "Media"]
    field_groups: Record<string, string[]>; // content_type -> field group names
  };
}

interface ManifestContentType {
  count: number;
  sample_fields: string[];        // Field names found
  has_custom_fields: boolean;
  items: { id: number; title: string; slug: string; status: string; date: string; }[];
}

interface MenuItem {
  title: string;
  url: string;
  type: "page" | "post" | "custom" | "category";
  target_id?: number;
  children?: MenuItem[];
}
```

### 2.4 Checkpoint Format

Checkpoints are stored as JSON files in `.unpress/checkpoints/`:

```typescript
interface Checkpoint {
  id: string;                     // UUID
  session_id: string;
  phase: string;
  step: string;                   // e.g., "migrate:posts:42" (post ID 42)
  timestamp: string;
  state: Record<string, any>;     // Phase-specific progress data
  completed_items: string[];      // IDs of completed items
  pending_items: string[];        // IDs remaining
}

// Storage location: {project_root}/.unpress/ (created by orchestrator)
// Path: .unpress/checkpoints/{session_id}/{phase}-{step}.json
// Sessions: .unpress/sessions/{session_id}/summary.json
// Cross-platform: uses path.join() — works on Windows, macOS, Linux
// On resume: load latest checkpoint for current phase, skip completed_items
```

### 2.5 Orchestrator Communication Model

Phases are **TypeScript modules imported directly** by the orchestrator — not separate MCP servers or processes. The orchestrator is the only MCP server. Phases export a standard interface:

```typescript
interface Phase<TInput, TOutput> {
  name: string;
  run(input: TInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, TOutput>;
}

interface PhaseContext {
  session_id: string;
  skill_level: "novice" | "medium" | "expert";
  checkpoint: CheckpointManager;
  wizard: WizardBridge;          // Send updates to the wizard UI
  logger: Logger;
}

type PhaseEvent =
  | { type: "progress"; percent: number; message: string; }
  | { type: "decision"; id: string; question: string; options: string[]; }
  | { type: "error"; error: Error; recoverable: boolean; }
  | { type: "checkpoint"; data: Checkpoint; };
```

---

## 3. Architecture

### 3.1 Approach: Orchestrator + Phase MCPs

A monorepo containing one orchestrator MCP server that delegates to specialized phase modules.

```
┌─────────────────────────────────────────────────┐
│           UNPRESS ORCHESTRATOR (MCP)             │
│  Manages flow · Tracks progress · Adaptive UX   │
│  Error recovery · Checkpoint management          │
└──────┬──────┬──────┬──────┬──────┬──────┬───────┘
       │      │      │      │      │      │
       ▼      ▼      ▼      ▼      ▼      ▼
   ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
   │WIZARD││ SCAN ││MIGR. ││DESIGN││DEPLOY││COPIL.│
   └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘
```

### 3.2 Phase Descriptions

**Wizard (unpress-wizard)**
- Local Next.js app serving the onboarding UI at localhost
- Adaptive detail: novice (full guidance + screenshots), medium (key steps), expert (just input fields)
- Transforms into a live dashboard during migration phases
- Fallback: if localhost fails, saves HTML to disk + provides file path + Playwright verifies rendering
- Visual style: warm beige, coral accents, Inter font (matching amirbaldiga.com)

**Welcome screen messaging (shown before step 1):**
- "Why Unpress?" value proposition: speed, cost savings ($0 on free tiers), full ownership, no vendor lock-in, AI co-pilot for ongoing changes
- **Safety promise (prominently displayed):** "Your WordPress site stays exactly as it is. Unpress reads and copies your content — it never modifies, deletes, or touches your live site. Think of it as taking a photo of your house before building a new one."
- **What happens after migration:** concrete examples of the copilot: "After migration, you can ask Claude things like: 'Change my header color to blue', 'Add a testimonials section', 'Make the homepage more mobile-friendly' — and it just happens. Your site keeps getting better."

**Phase 1: Scan (unpress-scan)**

The scan phase has two components:
- **`unpress-wp` (PHP plugin):** Installed on the user's WP site. Exposes custom REST endpoints at `/wp-json/unpress/v1/` that perform deep scans and return structured JSON. The plugin is distributed as a `.zip` file via GitHub Releases and bundled in the monorepo at `plugins/unpress-wp/`. The wizard downloads it automatically during onboarding step 1.
- **`unpress-scan` (Node.js package):** Calls the plugin's REST endpoints from the user's local machine, assembles the manifest, and presents findings to the user.

**Authentication:** The WP plugin generates an application password (WP 5.6+ built-in feature) scoped to read-only during activation. The plugin displays this token once in the WP admin. The user pastes it into the wizard. All API calls use HTTP Basic Auth over HTTPS.

**Trust & Transparency Badge:**
The WP plugin includes a visible trust section in the WP admin panel after installation:

- **AI-Built & Verified Badge:** "This plugin was written, tested, re-tested, and security-verified by Claude Code and the Ruflo orchestration framework. Every line of code has been through automated security scanning, static analysis, and behavioral testing."
- **Open Source Transparency:** "100% of this plugin's source code is public on GitHub. You can read every line before installing."
- **"Verify It Yourself" prompt:** The plugin page includes a copyable prompt the user can paste into their own AI (ChatGPT, Claude, Gemini, etc.): *"I'm about to install a WordPress plugin called Unpress. Here's its source code: [GitHub link]. Please review it for security vulnerabilities, data exfiltration, and any code that modifies my WordPress database or sends data to external servers."*
- **AI Verification Checkbox:** Before the plugin activates its REST endpoints, the user must check a confirmation box: ☐ **"I've reviewed this plugin (or had my AI/agent review it) and I'm comfortable installing it."** This is not a legal gate — it's a trust-building UX moment that makes users feel in control and signals that Unpress takes their security seriously.
- **Read-only guarantee badge:** Prominently displayed: "🔒 READ-ONLY — This plugin cannot modify, delete, or write to your WordPress database. It only reads content for migration purposes."

**Scan capabilities:** posts, pages, custom post types, ACF/custom fields, media, menus, categories, tags, taxonomies, WooCommerce products, SEO metadata (Yoast/RankMath), legal pages (privacy, terms, accessibility), tracking codes (GA, Meta Pixel, GTM), sitemap structure, active plugins list, page builder detection.

**Page builder detection:** The scan detects if Elementor, Divi, WPBakery, or Beaver Builder is active. If detected, the wizard warns the user: "Your site uses [Elementor]. Page builder content uses special formatting that may not convert perfectly. We'll do our best, but you may need to review some pages after migration." Content from page builders is extracted as rendered HTML (via the WP REST API's `rendered` field) rather than parsing shortcodes.

Produces a structured `manifest.json` (see Section 2.3 for schema). Presents findings to user: "Found 47 posts, 12 pages, 3 custom post types, WooCommerce with 200 products, Yoast SEO data" — user picks what to migrate.

**Phase 2: Migrate (unpress-migrate)**
- Reads manifest + WP REST API
- HTML → Sanity Portable Text via `@sanity/block-tools`
- Media download → Sanity CDN re-upload
- Auto-generates Sanity schemas from detected content types
- Preserves SEO metadata → Next.js metadata + next-sitemap
- Tracking codes → Next.js Script components
- Legal pages → dedicated Sanity document type
- Menus → Sanity navigation documents
- Custom Sanity Studio desk structure mirroring WP admin layout (tabs, field order, grouping)
- All **content** is dynamic in Sanity — every text, image, link, button label, nav item editable in Sanity
- Global content (site title, footer, nav, tracking codes) via "Site Settings" singleton document
- **WooCommerce scope:** Product catalog (name, description, price, images, categories, variants) is migrated as Sanity documents. Checkout/cart/payment functionality is NOT migrated — the user is advised to integrate Shopify Buy Button, Snipcart, or similar headless e-commerce. The scan phase warns: "WooCommerce detected. Product content will be migrated. For checkout functionality, we recommend connecting a headless e-commerce solution after migration."

**Phase 3: Design (unpress-design)**
- User provides 3-5 inspiration website URLs
- Playwright screenshots + style extraction (colors, fonts, spacing, layout patterns)
- Generates design tokens → Tailwind config
- Builds Next.js pages using 21st.dev Magic MCP for component generation
- shadcn/ui MCP for component API reference
- mcp-icon for semantic icon search (100K+ icons)
- Visual QA via Playwright after generation
- Google Stitch MCP for additional design prototyping if needed (optional — design works without it)
- Figma Developer MCP for importing existing Figma designs (optional — only if user has Figma files)

**Design analysis approach:** Playwright captures full-page screenshots of each inspiration site at 3 viewports (mobile, tablet, desktop). Claude analyzes the screenshots visually to identify: dominant colors (primary, secondary, accent), font families and sizing scale, spacing patterns, layout structure (hero style, grid vs. list, sidebar usage), and overall vibe (minimal, bold, corporate, playful). When styles from multiple inspiration sites conflict, Claude presents the options to the user via the wizard dashboard: "We noticed different approaches — which feels more you?"

**Required MCPs:** 21st.dev Magic, shadcn/ui MCP, mcp-icon, Playwright. **Optional:** Google Stitch, Figma Developer MCP, Storybook MCP. If an optional MCP is unavailable, the phase continues without it. If a required MCP is down, the phase pauses and retries after 30 seconds (3 attempts), then falls back to generating components from the base Next.js + shadcn template without AI component generation.

**Phase 3.5: Preview & Approve (built into design→deploy handoff)**
Before anything goes live, the user gets a full preview:
- The generated Next.js site runs locally at `localhost:3000`
- The wizard dashboard shows a side-by-side: **old WP site** ↔ **new site preview**
- Playwright captures screenshots at mobile, tablet, and desktop viewports
- The user browses the preview and can request changes: "Make the header bigger", "I don't like this font"
- Claude iterates on the design until the user approves
- **Only after the user clicks "Looks good — deploy!"** does the deploy phase begin
- This is a hard gate — no automatic deployment without user approval

**Fallback templates:** If the AI-generated design doesn't satisfy the user after 3 iterations, offer 5 battle-tested templates (blog, portfolio, business, landing page, documentation) as a safety net. These are pre-built, polished, and guaranteed to look good. The user's content is poured into the chosen template.

**Phase 4: Deploy (unpress-deploy)**
- Creates GitHub repository
- Pushes generated Next.js project
- Creates Vercel project + connects repo
- Sets environment variables (Sanity project ID, dataset, token)
- Triggers first deployment to a **preview URL** (not production domain)
- Runs health check (Playwright navigates preview URL, verifies all pages render)
- Shows user the live preview URL: "Your site is live at preview-abc123.vercel.app — check it out!"
- **Second approval gate:** User confirms → Vercel promotes to production / connects custom domain
- Connects custom domain if provided

**Copilot (unpress-copilot)**
- Post-migration Claude co-pilot
- Reads Sanity schemas + site codebase
- **Scoped capabilities:** modify existing components, add new pages/sections using the same design system, update Sanity schemas, optimize performance, adjust responsive behavior
- **Out of scope:** backend logic, auth systems, payment processing, database operations — the copilot is a frontend/content tool, not a full-stack developer
- Commits changes to GitHub → auto-deploys via Vercel

### 3.3 Design MCP Stack (Bundled)

These MCP servers are pre-configured and available to Claude during the design phase:

| MCP Server | Package | Purpose |
|-----------|---------|---------|
| 21st.dev Magic | `@21st-dev/magic` | Component generation, refinement, logo search |
| Google Stitch | `stitch-mcp` | AI-powered UI/UX design prototyping |
| shadcn/ui MCP | `@jpisnice/shadcn-ui-mcp-server` | Component API reference & patterns |
| mcp-icon | `mcp-icon` | Semantic search across 100K+ icons |
| Figma Developer MCP | `figma-developer-mcp` | Import existing Figma designs to code |
| Playwright | `@playwright/mcp` | Visual QA & responsive testing |
| Storybook MCP | `@storybook/mcp` | Component documentation & testing (optional) |

---

## 4. Onboarding Flow

### 4.1 Wizard Steps

The wizard runs BEFORE any migration phase. It collects all credentials and preferences first.

| Step | Title | Time Est. | What Happens |
|------|-------|-----------|-------------|
| 0 | Welcome + Skill Level | 30 sec | Why Unpress, safety promise, pick novice/medium/expert |
| 1 | Install WP Plugin | 2-3 min | Download + install unpress-wp.zip, trust verification, AI review prompt |
| 2 | Connect WordPress | 1 min | Enter site URL → live verification → scan summary + cost estimate |
| 3 | Set Up Sanity | 3-5 min | Create Sanity account + project, paste project ID + API token |
| 4 | Set Up GitHub + Vercel | 3-5 min | "Sign in with GitHub" → auto-links Vercel (they share auth). Reduces 2 steps to 1. Fallback: manual setup if user prefers |
| 5 | Design Inspiration | 2-3 min | Paste 3-5 website URLs they love |
| 6 | Review + Launch | 1 min | Summary of all settings + cost breakdown → confirm → start migration |

**Total estimated time:** 15-20 minutes for novice, 5-10 for expert.

### 4.2 Cost Calculator

After the WordPress scan (step 2), the wizard shows a cost estimate based on the detected content:

```
📊 Estimated Monthly Cost for Your New Site

Based on your site: 47 posts, 12 pages, 230 images

  Sanity CMS     Free tier (up to 100K API requests/mo)     $0/mo
  Vercel         Free tier (100GB bandwidth)                 $0/mo
  GitHub         Free tier (unlimited public repos)          $0/mo
  ─────────────────────────────────────────────────────
  Total                                                      $0/mo ✅

💡 Your site fits comfortably within all free tiers!
```

For larger sites that exceed free tiers, show honest estimates:
```
⚠️ Your site (2,400 posts, 8,000 images) may exceed free tiers:

  Sanity CMS     Growth plan recommended                     $15/mo
  Vercel         Pro plan recommended                        $20/mo
  GitHub         Free tier                                   $0/mo
  ─────────────────────────────────────────────────────
  Estimated total                                            $35/mo

  Compare: typical WordPress hosting for this size           $30-80/mo
```

### 4.3 Adaptive Detail Levels

Each step renders differently based on selected skill level:

- **Novice (🌱):** Full explanations of what each service is and why it's needed. Step-by-step with screenshots. Analogies to familiar concepts. "Sanity is your new content editor — like WordPress admin but faster and AI-ready."
- **Medium (⚡):** Key instructions without explanations. "Create a Sanity project at sanity.io/manage, paste your project ID and token below."
- **Expert (🚀):** Just input fields. No instructions. User knows what to do.

### 4.4 Localhost Fallback

If the wizard's localhost URL doesn't render:
1. Wizard saves the current step as a standalone HTML file
2. Provides the OS-appropriate file path (e.g., `file:///Users/.../unpress-wizard-step1.html` on macOS, `file:///C:/Users/.../unpress-wizard-step1.html` on Windows)
3. Instructions for manual launch: `npx unpress wizard`
4. Playwright checks rendering before each step transition — catches failures early

### 4.5 Post-Onboarding Dashboard

After step 7, the wizard transforms into a live dashboard showing:
- Real-time progress through Scan → Migrate → Design → Deploy
- Decision prompts: "Found WooCommerce with 200 products — include them?"
- Page previews before deployment
- Error messages with recovery options (adapted to skill level)

---

## 5. Data Flow

### 5.1 Content Transformation Pipeline

```
WordPress (source)
  │
  ├── WP Plugin scan → manifest.json
  │     ├── posts (title, body, slug, date, author, featured image)
  │     ├── pages (including legal: privacy, terms, accessibility)
  │     ├── custom post types (products, portfolios, etc.)
  │     ├── media library (images, files, URLs)
  │     ├── menus & navigation structure
  │     ├── SEO metadata (Yoast/RankMath: title, desc, OG tags)
  │     ├── tracking codes (GA, Meta Pixel, GTM snippets)
  │     ├── sitemap structure
  │     ├── categories, tags, custom taxonomies
  │     └── ACF / custom fields
  │
  ▼
Sanity CMS (destination)
  │     ├── Portable Text documents (from HTML)
  │     ├── Sanity CDN assets (from WP media)
  │     ├── Auto-generated schemas per content type
  │     ├── Custom desk structure mirroring WP admin
  │     ├── "Site Settings" singleton (title, footer, nav, tracking)
  │     ├── Navigation documents (from WP menus)
  │     ├── Legal page document type
  │     └── SEO fields on every document
  │
  ▼
Next.js Site (generated)
  │     ├── Pages wired to Sanity queries (all text dynamic)
  │     ├── Tailwind config from design tokens
  │     ├── shadcn/ui + 21st.dev components
  │     ├── next-sitemap for SEO
  │     ├── Script components for tracking codes
  │     ├── Metadata API for SEO per page
  │     └── Sanity Studio embedded at /studio
  │
  ▼
Vercel (deployed)
        ├── GitHub repo connected
        ├── Environment variables set
        ├── Custom domain (optional)
        └── Health check passed
```

### 5.2 Dynamic Content Requirement

**All user-facing content must be editable in Sanity.** This includes:
- Page content (headings, paragraphs, images)
- Navigation labels and links
- Footer text and links
- CTA button labels
- SEO metadata (title, description, OG tags)
- Legal page content
- Tracking code snippets
- 404 page content
- Site name, tagline, logo

**Boundary — what is NOT dynamic:** UI chrome that is part of the framework/component library stays in code. This includes: loading spinners, form validation messages ("This field is required"), aria-labels for standard components, date formatting, pagination labels ("Next", "Previous"). These are developer concerns, not content editor concerns.

Implementation: A "Site Settings" singleton document in Sanity holds all global content. Page-level content lives in its respective document type. Content is fetched at build time (ISR) with on-demand revalidation — not per-request — so the site works even if Sanity is briefly unavailable.

### 5.3 Sanity Studio UX Matching

The generated Sanity Studio must feel familiar to WordPress users:

| WordPress | Sanity Studio Equivalent |
|-----------|------------------------|
| Posts / Pages / Products tabs | Desk structure with matching panes |
| Field groups (e.g., "SEO" metabox) | Fieldsets with collapsible groups |
| Categories / Tags | Reference documents with list views |
| Featured Image | Image field at same position |
| WYSIWYG editor | Portable Text editor (rich text) |
| Custom fields (ACF) | Matching Sanity field types |
| Media Library | Sanity asset browser |
| Menus | Navigation document type with nested items |
| Settings / Options pages | Singleton documents |

The Migrate phase auto-generates a `sanity.config.ts` with a custom desk structure that replicates the user's WP admin sidebar organization.

---

## 6. Error Handling

### 6.1 Strategy: Checkpoints + Auto-Retry + Clear Messaging

Every phase saves progress checkpoints. If the process fails, it resumes from the last checkpoint — no re-doing work.

| Phase | Common Errors | Recovery |
|-------|--------------|----------|
| WP Plugin | Auth failure, REST API disabled, plugin conflicts | Clear error message + specific fix per skill level |
| Migrate | Rate limits, media download failures, malformed HTML | Auto-retry 3x with exponential backoff, skip & log failures, resume from checkpoint |
| Design | Inspiration site unreachable, component generation fails | Fallback to default design tokens, retry with simpler component |
| Deploy | GitHub auth expired, Vercel build fails | Show build log, suggest fixes, allow re-deploy |

### 6.2 Error Messages by Skill Level

**Example: WP REST API disabled**

- **Novice:** "We can't connect to your site's content API. This is usually because a security plugin is blocking it. Go to your WordPress admin → Settings → Permalinks, and just click 'Save Changes' (don't change anything). This often fixes it. If that doesn't work, check if you have a plugin called 'Disable REST API' and deactivate it temporarily."
- **Medium:** "WP REST API is blocked. Check permalinks settings or disable 'Disable REST API' plugin."
- **Expert:** "REST API 403. Check permalink structure and REST API access."

---

## 7. Security

### 7.1 Credential Management

- All API keys stored in local `.env` file only — never leave the user's machine
- `.env` added to `.gitignore` automatically
- Keys never logged, never transmitted to external servers
- Everything runs locally via Claude Code

### 7.2 Token Scoping

| Token | Scope | Expiry |
|-------|-------|--------|
| WP auth token | Read-only (application password) | User-managed (revocable in WP admin) |
| Sanity API token | Scoped to specific project + dataset | User-managed |
| GitHub token | `repo` scope (create repos, push code) | User-managed |
| Vercel token | Project creation + deployment | User-managed |

### 7.3 Additional Security Measures

- HTTPS enforced for all API calls
- WP plugin file integrity check (checksum verification on install)
- No external server dependency — all processing is local
- Sanity webhook secrets for any post-deploy integrations
- Generated Next.js site includes security headers (CSP, HSTS, X-Frame-Options)

### 7.4 Rollback & Cleanup

If the user is unhappy with the result or something goes wrong:
- **Sanity:** The migration creates all content in a dedicated dataset (e.g., `production`). The orchestrator logs every document ID created. A `unpress_rollback` tool can delete all created documents.
- **GitHub:** The repo name and creation timestamp are logged. User can delete via GitHub or the orchestrator can remove it.
- **Vercel:** Project ID is logged. Same approach — deletable via API.
- **Summary log:** Every migration session writes a `.unpress/sessions/{session_id}/summary.json` listing all external resources created (Sanity documents, GitHub repo URL, Vercel project URL), so nothing is orphaned.

---

## 8. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| MCP Server | TypeScript + Node.js | Standard MCP ecosystem, type safety |
| WP Plugin | PHP | WordPress native |
| Onboarding Wizard | Next.js 15 + Tailwind + shadcn/ui | Same stack as generated site |
| Content Migration | `@sanity/migrate` + custom transformers | Official tooling, batching, idempotency |
| HTML → Portable Text | `@sanity/block-tools` | Official converter |
| Generated Website | Next.js 15 + Tailwind + shadcn/ui + `next-sanity` | Modern, fast, Vercel-native |
| CMS | Sanity v3 + custom Studio config | Real-time editing, custom desk |
| Design Analysis | Playwright | Headless browser for style extraction |
| Component Generation | 21st.dev Magic MCP + mcp-icon | Production components + icons |
| Deployment | GitHub API + Vercel API | Automated pipeline |
| Testing | Vitest + Playwright | Unit + visual regression |
| Monorepo | Turborepo | Fast builds, shared dependencies |

---

## 9. Package Structure

```
unpress/
├── packages/
│   ├── unpress/              # Main orchestrator MCP server (npm: unpress)
│   ├── unpress-scan/         # WP manifest reader + content detection
│   ├── unpress-migrate/      # Content transformation + Sanity writing
│   ├── unpress-design/       # Inspiration analysis + site generation
│   ├── unpress-deploy/       # GitHub + Vercel automation
│   ├── unpress-wizard/       # Local Next.js onboarding UI + dashboard
│   └── unpress-copilot/      # Post-migration Claude co-pilot tools
├── plugins/
│   └── unpress-wp/           # WordPress plugin (PHP)
├── templates/
│   └── next-sanity/          # Base Next.js + Sanity site template
├── docs/                     # Documentation
├── turbo.json                # Turborepo config
├── package.json              # Root package.json
└── .env.example              # Template for required keys
```

---

## 10. Existing Tools to Build On

| Tool | How We Use It |
|------|--------------|
| `mcp-wordpress` (npm) | Reference for WP MCP tool patterns |
| `salttechno/wp-to-sanity-migration` | Fork/reference for HTML→Portable Text + media migration |
| `@sanity/migrate` | Foundation for writing content to Sanity |
| `@sanity/block-tools` | HTML to Portable Text conversion |
| Sanity MCP Server (`mcp.sanity.io`) | AI-agent-driven content operations in Sanity |
| `vercel-mcp-server` | Reference for Vercel deployment automation |
| WordPress/mcp-adapter | Reference for WP Abilities API patterns |

---

## 11. Success Criteria

1. A WordPress user with zero coding experience can complete onboarding + migrate a small site (<50 pages, <500 media files) in under 45 minutes using novice mode
2. An expert developer can complete the same in under 15 minutes
3. Generated site scores 90+ on Lighthouse (performance, accessibility, SEO)
4. Sanity Studio is immediately usable by someone familiar with WordPress
5. All user-facing content is dynamic — changing text in Sanity reflects on the live site after revalidation
6. Zero hardcoded content strings in the generated Next.js site (UI chrome excluded — see Section 4.2)
7. Migration is resumable — can be stopped and continued from any checkpoint
8. Error messages are actionable and adapted to skill level
9. Sites with >500 pages or >5000 media files complete migration with progress tracking and batched processing (no timeouts or memory issues)
10. Multilingual sites (WPML/Polylang): content from the primary language is migrated. A warning is shown: "Multilingual content detected. Primary language will be migrated. Additional languages can be added in Sanity after migration."

---

## 12. Credits

Built by Amir Baldiga · [Connect on LinkedIn](https://linkedin.com/in/amirbaldiag)
