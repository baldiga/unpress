# Unpress Wizard Steps 1–7 — Design Spec

## Goal

Build the complete onboarding wizard flow so a user can go from `git clone` to a fully configured migration pipeline in one session. Fix auto-launch UX so the wizard starts immediately after install. Fix the 404 on /step/1.

## Scope

1. **Auto-launch fix** — `pnpm start` builds and opens the wizard; postinstall prints instructions
2. **Dynamic step routing** — `/step/[step]` route handles all 7 steps
3. **7 wizard step pages** — each with adaptive content per skill level
4. **Verification API routes** — Next.js API routes that validate user inputs in real-time
5. **State persistence** — localStorage + URL params so users can refresh without losing progress
6. **QA** — all paths tested (novice/medium/expert × all steps × error states)

## Non-Goals

- No actual migration execution (that's the MCP server's job)
- No live dashboard (separate sub-project)
- No backend persistence (wizard is client-side, MCP server handles sessions)

---

## 1. Auto-Launch Fix

### Problem
After `git clone && pnpm install`, the user has no obvious way to start the wizard. There's no root `start` script, and the wizard is buried in `packages/unpress-wizard/`.

### Solution

**Root `package.json`** — add scripts:
```json
{
  "scripts": {
    "start": "pnpm turbo build --filter=@unpress/shared && pnpm --filter unpress-wizard dev",
    "wizard": "pnpm --filter unpress-wizard dev",
    "postinstall": "echo '\\n✨ Unpress installed! Run: pnpm start\\n'"
  }
}
```

**`packages/unpress-wizard/package.json`** — use `open-cli` to auto-open browser after dev server starts:
```json
{
  "scripts": {
    "dev": "next dev --port 3456",
    "dev:open": "next dev --port 3456 & sleep 2 && npx open-cli http://localhost:3456"
  },
  "devDependencies": {
    "open-cli": "^8"
  }
}
```

The root `start` script uses `dev:open` to auto-launch the browser. Port 3456 avoids conflicts with common dev servers on 3000.

**Root `package.json`** — update start to use `dev:open`:
```json
{
  "scripts": {
    "start": "pnpm turbo build --filter=@unpress/shared && pnpm --filter unpress-wizard dev:open",
    "wizard": "pnpm --filter unpress-wizard dev",
    "postinstall": "node -e \"console.log('\\n  Unpress installed! Run: pnpm start\\n')\""
  }
}
```

Note: `postinstall` uses `node -e` for cross-platform newline support (Windows + Unix).

### User Flow After Fix
```
git clone https://github.com/baldiga/unpress.git
cd unpress
pnpm install          → prints "Unpress installed! Run: pnpm start"
pnpm start            → builds shared types, starts wizard, opens browser at localhost:3456
```

---

## 2. Routing Architecture

### Problem
The welcome page links to `/step/1?level=novice` but no route exists → 404.

### Solution
Single dynamic route: `src/app/step/[step]/page.tsx`

```
src/app/
  layout.tsx              → Shell (nav, footer, step dots)
  page.tsx                → Welcome page (Step 0)
  step/
    [step]/
      page.tsx            → Dynamic step renderer
  api/
    verify/
      wordpress/route.ts  → WP health + manifest verification
      sanity/route.ts     → Sanity API ping
      github/route.ts     → GitHub token verification
      vercel/route.ts     → Vercel token verification
```

### URL Structure
- `/` — Welcome + skill level selection
- `/step/1?level=novice` — Install WP Plugin
- `/step/2?level=novice` — Connect WordPress
- `/step/3?level=novice` — Set Up Sanity
- `/step/4?level=novice` — Set Up GitHub
- `/step/5?level=novice` — Set Up Vercel
- `/step/6?level=novice` — Design Inspiration
- `/step/7?level=novice` — Review & Launch

---

## 3. State Management

All wizard state lives in **localStorage** under key `unpress-wizard`:

```typescript
interface WizardState {
  level: "novice" | "medium" | "expert";
  currentStep: number;
  completedSteps: number[];
  wp_url?: string;
  wp_auth_token?: string;
  wp_verified?: boolean;
  wp_manifest_summary?: { posts: number; pages: number; media: number; plugins: string[] };
  sanity_project_id?: string;
  sanity_token?: string;
  sanity_verified?: boolean;
  github_token?: string;
  github_username?: string;
  github_verified?: boolean;
  vercel_token?: string;
  vercel_verified?: boolean;
  inspiration_urls?: string[];
}
```

### Level Param Threading
The `level` param MUST be present in the URL on every step page (`?level=novice`). All navigation links (back, forward, step dots) MUST propagate the `?level=` param. The URL is the primary source — if localStorage has a different level, the URL wins. If the URL has no level param, fall back to localStorage, then default to "novice".

### Token Security
Tokens (`wp_auth_token`, `sanity_token`, `github_token`, `vercel_token`) are stored in localStorage only during the wizard session. They MUST be cleared:
- When the user clicks "Start Migration" on step 7 (after handing them to the MCP server)
- When the user explicitly clicks a "Reset Wizard" action
- Tokens are NEVER logged to the console or included in error messages
- The `useWizardState()` hook's `clear()` method removes ALL state including tokens

### completedSteps Array
The `completedSteps` array tracks which steps the user has successfully verified. A step is added to the array only after its verification succeeds. The step-dots component uses this: completed = green, current = orange, future = gray.

A `useWizardState()` hook provides get/set/clear/markStepComplete operations.

---

## 4. Step Definitions

Each step has three variants (novice/medium/expert) that control how much instructional content is shown.

### Step 1: Install WordPress Plugin

**Purpose:** User downloads and installs the Unpress WP plugin.

**Novice view:**
- Estimated time: 2–3 minutes
- Numbered instructions with WP admin screenshots (CSS mockups, not real screenshots)
- "What is a plugin?" explainer callout
- Download button for `unpress-wp.zip` (links to GitHub release asset or bundled in /public)
- Input: site URL (e.g., `https://mysite.com`)
- "Verify Connection" button → hits `/api/verify/wordpress` which calls `{url}/wp-json/unpress/v1/health`
- Success: green checkmark + "Found WordPress X.X — plugin active!"
- Failure: red message + "Make sure the plugin is activated" with troubleshooting tips

**Medium view:** Same but without the screenshots and explainers — just the numbered steps and input.

**Expert view:** Just the URL input field and verify button. No instructions.

### Step 2: Connect WordPress

**Purpose:** User copies the auth token from the WP trust badge page.

**Novice view:**
- Instructions to go to WP Admin → Unpress page
- Screenshot mockup of the trust badge page showing where the token is
- Explainer: "This token lets Unpress read your content. It cannot modify anything."
- Checkbox reminder: "Make sure you checked the consent checkbox on the WordPress page"
- Read-only display of the WP URL (from step 1 state, stored in localStorage via `useWizardState()`)
- Input: auth token (password field)
- "Verify" button → hits `/api/verify/wordpress` with URL (from state) + token, calls `/wp-json/unpress/v1/manifest`
- Success: shows content summary — "Found 47 posts, 12 pages, 234 media files, WooCommerce active"
- Failure: "Token invalid or plugin not verified — check the consent checkbox"

**Medium view:** Token input + verify, brief instruction.

**Expert view:** Token input + verify only.

### Step 3: Set Up Sanity CMS

**Purpose:** User creates a Sanity account and provides project ID + API token.

**Novice view:**
- "What is Sanity?" — 2-sentence explainer: "Sanity is your new content editor — like WordPress admin but faster and AI-ready. Your posts, pages, and media will live here after migration."
- Step-by-step: go to sanity.io → create account (sign in with GitHub for speed) → create project → go to manage.sanity.io → API → Tokens → Add token (Editor permissions)
- Inputs: Project ID, Dataset (default "production"), API Token
- "Verify" button → hits `/api/verify/sanity` which calls Sanity API
- Success: "Connected to Sanity project 'xyz'!"

**Medium view:** Direct links + inputs + verify.

**Expert view:** Three input fields + verify.

### Step 4: Set Up GitHub

**Purpose:** User provides a GitHub Personal Access Token.

**Novice view:**
- "What is GitHub?" — "GitHub is where your website's code will live. Think of it as a safe vault for your site — every change is tracked and can be undone."
- Instructions: go to github.com/settings/tokens → Generate new token (classic) → select scopes: `repo`, `workflow` → copy token
- Input: GitHub token (password field)
- "Verify" button → hits `/api/verify/github` which calls GitHub `/user` API
- Success: "Connected as @username!"

**Medium view:** Link to token page + input + verify.

**Expert view:** Token input + verify.

### Step 5: Set Up Vercel

**Purpose:** User provides a Vercel access token.

**Novice view:**
- "What is Vercel?" — "Vercel is where your website goes live — it's like your hosting but 10x faster. Your site will be available at yourproject.vercel.app within seconds of deployment."
- Instructions: go to vercel.com → create account (sign in with GitHub) → Settings → Tokens → Create Token
- Input: Vercel token (password field)
- "Verify" button → hits `/api/verify/vercel` which calls Vercel `/v2/user` API
- Success: "Connected to Vercel as username!"

**Medium view:** Link + input + verify.

**Expert view:** Token input + verify.

### Step 6: Design Inspiration

**Purpose:** User shares 3–5 websites they love.

**All levels (same content, it's fun not technical):**
- "Share 3–5 websites whose design you love. We'll analyze their visual DNA — colors, fonts, layout, vibe — and create something that matches your taste."
- 5 URL input fields (first 3 required, last 2 optional)
- URL validation: must start with `https://`, must resolve to a public hostname (no `localhost`, `127.0.0.1`, `10.*`, `192.168.*`, `169.254.*`). This prevents SSRF when the design phase later fetches these URLs server-side.
- No external verification at wizard time — URLs are stored for the design phase
- Display: entered URLs shown as cards with the domain name

### Step 7: Review & Launch

**Purpose:** Summary of everything collected, final confirmation.

**All levels:**
- Summary cards for each previous step showing verified status:
  - WordPress: site URL + content counts
  - Sanity: project ID + dataset
  - GitHub: username
  - Vercel: connected status
  - Design: N inspiration sites
- Cost estimate (from the scan phase cost calculator)
- "Start Migration" button (large, prominent)
- What happens next: "Unpress will scan your content, migrate it to Sanity, generate your new site, and deploy it. You'll be able to preview everything before it goes live."
- **Launch mechanism:** The button generates a JSON config blob containing all collected settings (wp_url, auth token, Sanity config, GitHub token, Vercel token, inspiration URLs, skill level) and displays it in a copyable code block with the instruction: "Paste this into your Claude conversation to start the migration." The config is formatted as an `unpress_start` MCP tool call. This avoids needing a live MCP connection from the wizard.
- After displaying the config, all tokens are cleared from localStorage (security requirement from Section 3).

---

## 5. Shared UI Components

### StepLayout
Wraps every step page with consistent structure:
- Progress bar (step N of 7)
- Step dots in nav (update from layout)
- Back/forward navigation (back goes to previous step, disabled on step 1)
- Estimated time badge
- Skill level badge

### VerifyButton
Reusable component for all verification steps:
- Idle state: "Verify Connection →"
- Loading state: spinner + "Verifying..."
- Success state: green checkmark + success message + "Continue →" enabled
- Error state: red X + error message + retry button

### InstructionCard
Adaptive instruction display:
- `level="novice"`: Full numbered steps, screenshot mockups, explainer callouts
- `level="medium"`: Condensed steps, no screenshots
- `level="expert"`: Hidden entirely

### InputField
Styled consistently with Unpress branding:
- Label, input, optional helper text
- Password mode for tokens (with show/hide toggle)
- Validation state (neutral, error, success)

---

## 6. API Verification Routes

All routes are Next.js API routes (`src/app/api/verify/*/route.ts`). They act as proxies so the browser doesn't make direct cross-origin requests.

### POST /api/verify/wordpress
```typescript
Input: { url: string, token?: string }
If no token: GET {url}/wp-json/unpress/v1/health
If token:    GET {url}/wp-json/unpress/v1/manifest (with Basic auth)
Returns: { ok: boolean, data?: { wp_version, posts, pages, media, plugins }, error?: string }
```

### POST /api/verify/sanity
```typescript
Input: { project_id: string, dataset: string, token: string }
Calls: GET https://{project_id}.api.sanity.io/v2024-01-01/data/query/{dataset}?query=*[0]
Returns: { ok: boolean, project_name?: string, error?: string }
```

### POST /api/verify/github
```typescript
Input: { token: string }
Calls: GET https://api.github.com/user (with Bearer token)
Returns: { ok: boolean, username?: string, error?: string }
```

### POST /api/verify/vercel
```typescript
Input: { token: string }
Calls: GET https://api.vercel.com/v2/user (with Bearer token)
Returns: { ok: boolean, username?: string, error?: string }
```

---

## 7. Navigation & Layout Updates

### Client Component Wrapper for Dynamic Nav
The existing `layout.tsx` is a Server Component. Step dots and skill badge need to update per-page. Solution: extract the nav into a `NavBar` Client Component (`"use client"`) that reads the current URL path and search params via `usePathname()` and `useSearchParams()` from `next/navigation`.

### Nav Step Dots (inside NavBar Client Component)
Render dynamic dots based on current step (parsed from URL pathname `/step/N`):
- Completed steps: green dot (from `completedSteps` in localStorage via `useWizardState()`)
- Current step: orange elongated pill
- Future steps: gray dot

### Skill Badge (inside NavBar Client Component)
Read `?level=` from `useSearchParams()`:
- novice: "🌱 Novice"
- medium: "⚡ Medium"
- expert: "🚀 Expert"
- fallback (no param, welcome page): "🌱 Novice"

### Back Navigation
Each step has a "← Back" link in the top-left of the main content area. The link MUST include `?level=` param.

---

## 8. QA Requirements

### Test Framework
Use **Playwright** for end-to-end testing. Add `@playwright/test` as a devDependency to `packages/unpress-wizard`. Tests live in `packages/unpress-wizard/e2e/`. The wizard `package.json` test script becomes: `"test": "playwright test"`.

Playwright is the right choice because:
- The wizard is primarily a navigation + form + verification flow — E2E tests cover the real user paths
- Component unit tests would just test shadcn wrappers (low value)
- The API routes need real HTTP calls to verify proxy behavior

### Test Matrix
Every path must be tested:
- All 3 skill levels × all 7 steps render without errors
- Verify buttons show loading → success and loading → error states (mock API responses)
- Navigation: forward/back between all steps preserves state
- localStorage persistence: refresh any step and state is preserved
- Edge cases: empty inputs, invalid URLs, network errors
- The welcome page → step 1 transition works for all 3 levels (the current 404 bug)
- Auto-launch: `pnpm start` opens the wizard in browser
- Level param is threaded through all navigation links
- Tokens are cleared from localStorage after step 7 launch

### Swarm QA
After implementation, dispatch parallel QA agents — one per skill level — each walking through the entire wizard flow and reporting issues.

---

## 9. Branding

Consistent with Phase 1:
- Background: #F5F0EB (cream)
- Primary: #D4603A (Unpress orange)
- Success: #22c55e (green)
- Text: #1a1a1a (near-black)
- Muted: #6b6058
- Font: Inter
- Footer: "Built by Amir Baldiga · Connect on LinkedIn"
- Logo: `<span class="text-[#D4603A]">Un</span>press`
