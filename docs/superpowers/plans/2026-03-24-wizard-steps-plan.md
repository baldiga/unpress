# Wizard Steps 1–7 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete 7-step onboarding wizard with adaptive skill levels, verification APIs, auto-launch, and E2E tests.

**Architecture:** Single dynamic route (`/step/[step]/page.tsx`) renders all 7 steps. A `useWizardState()` hook manages localStorage persistence. Four Next.js API routes proxy verification calls. A `NavBar` Client Component handles dynamic step dots and skill badge. Root scripts enable `pnpm start` auto-launch.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Playwright (E2E tests)

**Spec:** `docs/superpowers/specs/2026-03-24-wizard-steps-design.md`

---

## File Structure

```
packages/unpress-wizard/
  src/
    app/
      layout.tsx                          → MODIFY: replace static nav with NavBar Client Component
      page.tsx                            → KEEP: welcome page (already works)
      step/
        [step]/
          page.tsx                        → CREATE: dynamic step renderer
      api/
        verify/
          wordpress/route.ts              → CREATE: WP health + manifest verification proxy
          sanity/route.ts                 → CREATE: Sanity API verification proxy
          github/route.ts                 → CREATE: GitHub token verification proxy
          vercel/route.ts                 → CREATE: Vercel token verification proxy
    components/
      nav-bar.tsx                         → CREATE: Client Component for dynamic nav
      step-layout.tsx                     → CREATE: shared step wrapper (progress, back nav)
      verify-button.tsx                   → CREATE: reusable verify button with states
      instruction-card.tsx                → CREATE: adaptive instruction display per level
      input-field.tsx                     → CREATE: branded input with password toggle
      steps/
        step1-install-plugin.tsx          → CREATE: WP plugin install step
        step2-connect-wordpress.tsx       → CREATE: WP auth token step
        step3-setup-sanity.tsx            → CREATE: Sanity credentials step
        step4-setup-github.tsx            → CREATE: GitHub token step
        step5-setup-vercel.tsx            → CREATE: Vercel token step
        step6-design-inspiration.tsx      → CREATE: inspiration URLs step
        step7-review-launch.tsx           → CREATE: review summary + launch
    hooks/
      use-wizard-state.ts                → CREATE: localStorage state management hook
    lib/
      utils.ts                           → KEEP: existing shadcn utils
      wizard-types.ts                    → CREATE: WizardState interface + step metadata
  e2e/
    wizard-flow.spec.ts                  → CREATE: Playwright E2E tests
  playwright.config.ts                   → CREATE: Playwright configuration
  package.json                           → MODIFY: add scripts, devDeps
```

Root files:
```
package.json                             → MODIFY: add start, wizard, postinstall scripts
```

---

## Chunk 1: Foundation (Auto-Launch, State Hook, NavBar, Step Route)

### Task 1: Fix Auto-Launch and Root Scripts

**Files:**
- Modify: `package.json` (root)
- Modify: `packages/unpress-wizard/package.json`

- [ ] **Step 1: Add root start/wizard/postinstall scripts**

Edit root `package.json` — add to `"scripts"`:
```json
"start": "pnpm turbo build --filter=@unpress/shared && pnpm --filter unpress-wizard dev",
"wizard": "pnpm --filter unpress-wizard dev",
"postinstall": "node -e \"console.log('\\n  Unpress installed! Run: pnpm start\\n')\""
```

- [ ] **Step 2: Update wizard dev script to use port 3456**

Edit `packages/unpress-wizard/package.json` — change `"dev"` to:
```json
"dev": "next dev --port 3456"
```

- [ ] **Step 3: Verify auto-launch works**

Run: `cd packages/unpress-wizard && pnpm dev`
Expected: Dev server starts on port 3456, accessible at http://localhost:3456

- [ ] **Step 4: Commit**

```bash
git add package.json packages/unpress-wizard/package.json
git commit -m "fix: add root start script, wizard port 3456 for auto-launch"
```

---

### Task 2: Create WizardState Types and Hook

**Files:**
- Create: `packages/unpress-wizard/src/lib/wizard-types.ts`
- Create: `packages/unpress-wizard/src/hooks/use-wizard-state.ts`

- [ ] **Step 1: Create wizard types**

Create `packages/unpress-wizard/src/lib/wizard-types.ts`:

```typescript
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
```

- [ ] **Step 2: Create useWizardState hook**

Create `packages/unpress-wizard/src/hooks/use-wizard-state.ts`:

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import type { WizardState, SkillLevel } from "@/lib/wizard-types";
import { INITIAL_STATE } from "@/lib/wizard-types";

const STORAGE_KEY = "unpress-wizard";

function loadState(): WizardState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    return { ...INITIAL_STATE, ...JSON.parse(raw) };
  } catch {
    return INITIAL_STATE;
  }
}

function saveState(state: WizardState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useWizardState(urlLevel?: SkillLevel) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    // URL level param takes precedence
    if (urlLevel) {
      loaded.level = urlLevel;
    }
    setState(loaded);
    setHydrated(true);
  }, [urlLevel]);

  const update = useCallback((partial: Partial<WizardState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      saveState(next);
      return next;
    });
  }, []);

  const markStepComplete = useCallback((step: number) => {
    setState((prev) => {
      const completedSteps = prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step];
      const next = { ...prev, completedSteps };
      saveState(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setState(INITIAL_STATE);
  }, []);

  const clearTokens = useCallback(() => {
    setState((prev) => {
      const next = {
        ...prev,
        wp_auth_token: undefined,
        sanity_token: undefined,
        github_token: undefined,
        vercel_token: undefined,
      };
      saveState(next);
      return next;
    });
  }, []);

  return { state, hydrated, update, markStepComplete, clear, clearTokens };
}
```

- [ ] **Step 3: Verify build**

Run: `cd packages/unpress-wizard && pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add packages/unpress-wizard/src/lib/wizard-types.ts packages/unpress-wizard/src/hooks/use-wizard-state.ts
git commit -m "feat: add wizard state types and useWizardState hook"
```

---

### Task 3: Create NavBar Client Component and Update Layout

**Files:**
- Create: `packages/unpress-wizard/src/components/nav-bar.tsx`
- Modify: `packages/unpress-wizard/src/app/layout.tsx`

- [ ] **Step 1: Create NavBar component**

Create `packages/unpress-wizard/src/components/nav-bar.tsx`:

```tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { STEPS, LEVEL_META } from "@/lib/wizard-types";
import type { SkillLevel } from "@/lib/wizard-types";

function NavBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const level = (searchParams.get("level") as SkillLevel) || "novice";
  const levelMeta = LEVEL_META[level] || LEVEL_META.novice;

  // Parse current step from pathname: /step/3 → 3, / → 0
  const stepMatch = pathname.match(/^\/step\/(\d+)$/);
  const currentStep = stepMatch ? parseInt(stepMatch[1], 10) : 0;

  // Read completed steps from localStorage (client-side only)
  let completedSteps: number[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("unpress-wizard");
      if (raw) {
        const parsed = JSON.parse(raw);
        completedSteps = parsed.completedSteps || [];
      }
    } catch { /* ignore */ }
  }

  return (
    <nav className="flex items-center justify-between px-12 py-5 max-w-5xl mx-auto">
      <Link href="/" className="text-2xl font-bold tracking-tight">
        <span className="text-[#D4603A]">Un</span>press
      </Link>

      {/* Step Dots */}
      <div className="flex items-center gap-2">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.number);
          const isCurrent = step.number === currentStep;

          return (
            <div
              key={step.number}
              className={`h-2.5 rounded-full transition-all ${
                isCompleted
                  ? "w-2.5 bg-[#2d8a56]"
                  : isCurrent
                  ? "w-8 bg-[#D4603A]"
                  : "w-2.5 bg-[#d4c5b5]"
              }`}
            />
          );
        })}
      </div>

      {/* Skill Badge */}
      <div className="bg-white px-3.5 py-1.5 rounded-full text-xs font-medium text-[#D4603A] border border-[#e8ddd3]">
        {levelMeta.icon} {levelMeta.label}
      </div>
    </nav>
  );
}

export function NavBar() {
  return (
    <Suspense fallback={
      <nav className="flex items-center justify-between px-12 py-5 max-w-5xl mx-auto">
        <div className="text-2xl font-bold tracking-tight">
          <span className="text-[#D4603A]">Un</span>press
        </div>
        <div className="flex items-center gap-2" />
        <div className="bg-white px-3.5 py-1.5 rounded-full text-xs font-medium text-[#D4603A] border border-[#e8ddd3]">
          🌱 Novice
        </div>
      </nav>
    }>
      <NavBarInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Update layout.tsx to use NavBar**

Replace the entire content of `packages/unpress-wizard/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
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
        <NavBar />

        <main className="max-w-3xl mx-auto px-12 pb-8">
          {children}
        </main>

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

- [ ] **Step 3: Verify build**

Run: `cd packages/unpress-wizard && pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add packages/unpress-wizard/src/components/nav-bar.tsx packages/unpress-wizard/src/app/layout.tsx
git commit -m "feat: add NavBar client component with dynamic step dots and skill badge"
```

---

### Task 4: Create Shared Step Components

**Files:**
- Create: `packages/unpress-wizard/src/components/step-layout.tsx`
- Create: `packages/unpress-wizard/src/components/verify-button.tsx`
- Create: `packages/unpress-wizard/src/components/instruction-card.tsx`
- Create: `packages/unpress-wizard/src/components/input-field.tsx`

- [ ] **Step 1: Create StepLayout**

Create `packages/unpress-wizard/src/components/step-layout.tsx`:

```tsx
"use client";

import Link from "next/link";
import { STEPS } from "@/lib/wizard-types";
import type { SkillLevel } from "@/lib/wizard-types";

interface StepLayoutProps {
  step: number;
  level: SkillLevel;
  children: React.ReactNode;
}

export function StepLayout({ step, level, children }: StepLayoutProps) {
  const meta = STEPS[step - 1];
  if (!meta) return null;

  return (
    <div className="space-y-6 pt-4">
      {/* Progress Overview */}
      <div className="flex items-center gap-1 p-4 bg-white rounded-xl border border-[#e8ddd3] overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${
              s.number === step ? "text-[#D4603A] font-bold" : "text-[#bbb0a3]"
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                s.number === step
                  ? "bg-[#D4603A] text-white"
                  : "bg-[#e8ddd3] text-[#8a7d72]"
              }`}>{s.number}</span>
              <span className="hidden sm:inline">{s.title}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-4 h-px bg-[#e0d6cb] mx-0.5 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Meta Bar */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-[#e8ddd3]">
          <span>⏱️</span>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#8a7d72] font-semibold">Est. Time</div>
            <div className="text-sm font-semibold">{meta.estimatedTime}</div>
          </div>
        </div>
      </div>

      {/* Step Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#D4603A] font-semibold mb-2">
          Step {step} of 7
        </p>
        <h1 className="text-3xl font-bold tracking-tight leading-tight mb-2">
          {meta.title}
        </h1>
        <p className="text-[#6b6058] text-base leading-relaxed">
          {meta.description}
        </p>
      </div>

      {/* Step Content */}
      {children}

      {/* Back Navigation */}
      {step > 1 && (
        <div className="pt-4">
          <Link
            href={`/step/${step - 1}?level=${level}`}
            className="text-sm text-[#8a7d72] hover:text-[#D4603A] transition-colors"
          >
            ← Back to Step {step - 1}
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create VerifyButton**

Create `packages/unpress-wizard/src/components/verify-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

interface VerifyButtonProps {
  onVerify: () => Promise<{ ok: boolean; message: string }>;
  nextHref?: string;
  label?: string;
}

export function VerifyButton({ onVerify, nextHref, label = "Verify Connection" }: VerifyButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleClick = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const result = await onVerify();
      setStatus(result.ok ? "success" : "error");
      setMessage(result.message);
    } catch (err) {
      setStatus("error");
      setMessage("Connection failed. Please check your inputs and try again.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {status !== "success" && (
          <button
            onClick={handleClick}
            disabled={status === "loading"}
            className="px-6 py-3 bg-[#D4603A] text-white rounded-xl font-semibold text-sm hover:bg-[#b8502f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              <>{label} →</>
            )}
          </button>
        )}

        {status === "success" && nextHref && (
          <Link
            href={nextHref}
            className="px-6 py-3 bg-[#22c55e] text-white rounded-xl font-semibold text-sm hover:bg-[#16a34a] transition-colors"
          >
            Continue →
          </Link>
        )}
      </div>

      {message && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
          status === "success"
            ? "bg-[#f0fdf4] border border-[#22c55e] text-[#166534]"
            : "bg-[#fef2f2] border border-[#ef4444] text-[#991b1b]"
        }`}>
          <span>{status === "success" ? "✅" : "❌"}</span>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create InstructionCard**

Create `packages/unpress-wizard/src/components/instruction-card.tsx`:

```tsx
import type { SkillLevel } from "@/lib/wizard-types";

interface InstructionCardProps {
  level: SkillLevel;
  title: string;
  steps: string[];
  callout?: { icon: string; text: string };
  children?: React.ReactNode;
}

export function InstructionCard({ level, title, steps, callout, children }: InstructionCardProps) {
  if (level === "expert") return <>{children}</>;

  return (
    <div className="bg-white rounded-2xl border border-[#e8ddd3] overflow-hidden">
      <div className="px-6 py-4 bg-[#faf7f4] border-b border-[#e8ddd3] flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#dcfce7] text-[#166534] font-medium">
          {level === "novice" ? "🌱 Detailed" : "⚡ Quick"}
        </span>
      </div>
      <div className="p-6">
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[#3d352e] leading-relaxed">
              <span className="w-7 h-7 bg-[#D4603A] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: step }} />
            </li>
          ))}
        </ol>

        {level === "novice" && callout && (
          <div className="flex items-start gap-3 bg-[#fef9f0] border border-[#f0dfc8] rounded-xl p-4 mt-4 text-sm text-[#6b6058] leading-relaxed">
            <span className="text-lg flex-shrink-0">{callout.icon}</span>
            <span dangerouslySetInnerHTML={{ __html: callout.text }} />
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create InputField**

Create `packages/unpress-wizard/src/components/input-field.tsx`:

```tsx
"use client";

import { useState } from "react";

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "url";
  helper?: string;
  required?: boolean;
  readOnly?: boolean;
}

export function InputField({
  label, value, onChange, placeholder, type = "text", helper, required, readOnly,
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-[#3d352e]">
        {label}{required && <span className="text-[#D4603A]"> *</span>}
      </label>
      <div className="relative">
        <input
          type={isPassword && !showPassword ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`w-full px-4 py-3 border-[1.5px] border-[#e8ddd3] rounded-xl text-sm font-[inherit] bg-white text-[#1a1a1a] outline-none transition-colors focus:border-[#D4603A] placeholder:text-[#bbb0a3] ${
            readOnly ? "bg-[#faf7f4] cursor-not-allowed" : ""
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a7d72] hover:text-[#D4603A]"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {helper && <p className="text-xs text-[#8a7d72]">{helper}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `cd packages/unpress-wizard && pnpm build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add packages/unpress-wizard/src/components/
git commit -m "feat: add shared step components — StepLayout, VerifyButton, InstructionCard, InputField"
```

---

### Task 5: Create Dynamic Step Route and Step 1 (Install Plugin)

**Files:**
- Create: `packages/unpress-wizard/src/app/step/[step]/page.tsx`
- Create: `packages/unpress-wizard/src/components/steps/step1-install-plugin.tsx`

- [ ] **Step 1: Create the step 1 component**

Create `packages/unpress-wizard/src/components/steps/step1-install-plugin.tsx`:

```tsx
"use client";

import { InstructionCard } from "@/components/instruction-card";
import { InputField } from "@/components/input-field";
import { VerifyButton } from "@/components/verify-button";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step1Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

export function Step1InstallPlugin({ level, state, onUpdate, onComplete }: Step1Props) {
  const handleVerify = async () => {
    if (!state.wp_url) return { ok: false, message: "Please enter your WordPress site URL." };

    try {
      const res = await fetch("/api/verify/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.wp_url }),
      });
      const data = await res.json();

      if (data.ok) {
        onUpdate({ wp_verified: false }); // Partially verified (health only, no token yet)
        onComplete();
        return { ok: true, message: `Found WordPress ${data.data?.wp_version || ""} — plugin active!` };
      }
      return { ok: false, message: data.error || "Could not connect. Make sure the plugin is installed and activated." };
    } catch {
      return { ok: false, message: "Network error. Check the URL and try again." };
    }
  };

  return (
    <div className="space-y-6">
      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "<strong>Log in to your WordPress site</strong> — go to <strong>yourdomain.com/wp-admin</strong> and sign in with your admin account",
          "In the left sidebar, hover over <strong>&quot;Plugins&quot;</strong> and click <strong>&quot;Add New Plugin&quot;</strong>",
          "Click the <strong>&quot;Upload Plugin&quot;</strong> button at the top of the page",
          "Click <strong>&quot;Choose File&quot;</strong> and select the <strong>unpress-wp.zip</strong> file — you can download it from the <a href='https://github.com/baldiga/unpress/tree/master/plugins/unpress-wp' target='_blank' rel='noopener' class='text-[#D4603A] underline'>GitHub repo</a>",
          "Click <strong>&quot;Install Now&quot;</strong> and wait for it to finish — then click <strong>&quot;Activate Plugin&quot;</strong>",
        ]}
        callout={{
          icon: "💡",
          text: "<strong>Don&apos;t worry</strong> — this plugin only reads your content. It doesn&apos;t change anything on your WordPress site. You can remove it after the migration is complete.",
        }}
      />

      <div className="space-y-4">
        <InputField
          label="Your WordPress Site URL"
          value={state.wp_url || ""}
          onChange={(v) => onUpdate({ wp_url: v })}
          placeholder="https://yourdomain.com"
          type="url"
          required
          helper="Enter the URL of your WordPress site (without /wp-admin)"
        />
        <VerifyButton
          onVerify={handleVerify}
          nextHref={`/step/2?level=${level}`}
          label="Verify Connection"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the dynamic step route**

Create `packages/unpress-wizard/src/app/step/[step]/page.tsx`:

```tsx
"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { StepLayout } from "@/components/step-layout";
import { useWizardState } from "@/hooks/use-wizard-state";
import { Step1InstallPlugin } from "@/components/steps/step1-install-plugin";
import type { SkillLevel } from "@/lib/wizard-types";

function StepPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();

  const stepNum = parseInt(params.step as string, 10);
  const level = (searchParams.get("level") as SkillLevel) || "novice";
  const { state, hydrated, update, markStepComplete } = useWizardState(level);

  if (!hydrated) return null;
  if (stepNum < 1 || stepNum > 7) return <div className="pt-8 text-center">Step not found.</div>;

  const handleComplete = () => {
    markStepComplete(stepNum);
    update({ currentStep: stepNum + 1 });
  };

  const stepProps = { level, state, onUpdate: update, onComplete: handleComplete };

  return (
    <StepLayout step={stepNum} level={level}>
      {stepNum === 1 && <Step1InstallPlugin {...stepProps} />}
      {stepNum === 2 && <PlaceholderStep step={2} level={level} />}
      {stepNum === 3 && <PlaceholderStep step={3} level={level} />}
      {stepNum === 4 && <PlaceholderStep step={4} level={level} />}
      {stepNum === 5 && <PlaceholderStep step={5} level={level} />}
      {stepNum === 6 && <PlaceholderStep step={6} level={level} />}
      {stepNum === 7 && <PlaceholderStep step={7} level={level} />}
    </StepLayout>
  );
}

function PlaceholderStep({ step, level }: { step: number; level: SkillLevel }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8ddd3] p-8 text-center text-[#8a7d72]">
      <p className="text-lg font-semibold mb-2">Step {step} — Coming Soon</p>
      <p className="text-sm">This step will be implemented next.</p>
    </div>
  );
}

export default function StepPage() {
  return (
    <Suspense fallback={<div className="pt-8 text-center text-[#8a7d72]">Loading...</div>}>
      <StepPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify build and the 404 is fixed**

Run: `cd packages/unpress-wizard && pnpm build`
Expected: Build succeeds, `/step/[step]` route is registered

- [ ] **Step 4: Commit**

```bash
git add packages/unpress-wizard/src/app/step/ packages/unpress-wizard/src/components/steps/
git commit -m "feat: add dynamic step route and step 1 — install WP plugin"
```

---

## Chunk 2: API Verification Routes + Steps 2–5

### Task 6: Create API Verification Routes

**Files:**
- Create: `packages/unpress-wizard/src/app/api/verify/wordpress/route.ts`
- Create: `packages/unpress-wizard/src/app/api/verify/sanity/route.ts`
- Create: `packages/unpress-wizard/src/app/api/verify/github/route.ts`
- Create: `packages/unpress-wizard/src/app/api/verify/vercel/route.ts`

- [ ] **Step 1: Create WordPress verification route**

Create `packages/unpress-wizard/src/app/api/verify/wordpress/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url, token } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "URL is required" }, { status: 400 });
    }

    const baseUrl = url.replace(/\/+$/, "");

    if (token) {
      // Full manifest verification
      const authHeader = "Basic " + Buffer.from(token).toString("base64");
      const res = await fetch(`${baseUrl}/wp-json/unpress/v1/manifest`, {
        headers: { Authorization: authHeader },
      });

      if (!res.ok) {
        const status = res.status;
        if (status === 403) {
          return NextResponse.json({ ok: false, error: "Plugin not verified — check the consent checkbox in WP Admin → Unpress" });
        }
        return NextResponse.json({ ok: false, error: `WordPress returned ${status}. Check your auth token.` });
      }

      const manifest = await res.json();
      return NextResponse.json({
        ok: true,
        data: {
          wp_version: manifest.wp_version,
          posts: manifest.content?.posts?.count ?? 0,
          pages: manifest.content?.pages?.count ?? 0,
          media: manifest.media?.total ?? 0,
          plugins: manifest.plugins?.active?.map((p: { name: string }) => p.name) ?? [],
        },
      });
    } else {
      // Health check only
      const res = await fetch(`${baseUrl}/wp-json/unpress/v1/health`);

      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `Health check failed (${res.status}). Is the plugin installed and activated?` });
      }

      const data = await res.json();
      return NextResponse.json({
        ok: true,
        data: { wp_version: data.wp_version, status: data.status },
      });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Could not connect. Check the URL and try again." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create Sanity verification route**

Create `packages/unpress-wizard/src/app/api/verify/sanity/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { project_id, dataset, token } = await req.json();

    if (!project_id || !token) {
      return NextResponse.json({ ok: false, error: "Project ID and token are required" }, { status: 400 });
    }

    const ds = dataset || "production";
    const res = await fetch(
      `https://${project_id}.api.sanity.io/v2024-01-01/data/query/${ds}?query=*[_type == "sanity.imageAsset"][0]`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      const status = res.status;
      if (status === 401) return NextResponse.json({ ok: false, error: "Invalid token. Make sure you copied the full token." });
      if (status === 404) return NextResponse.json({ ok: false, error: "Project not found. Check your Project ID." });
      return NextResponse.json({ ok: false, error: `Sanity returned ${status}.` });
    }

    return NextResponse.json({ ok: true, data: { project_id, dataset: ds } });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not connect to Sanity." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create GitHub verification route**

Create `packages/unpress-wizard/src/app/api/verify/github/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token is required" }, { status: 400 });
    }

    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) return NextResponse.json({ ok: false, error: "Invalid token. Make sure you copied the full token." });
      return NextResponse.json({ ok: false, error: `GitHub returned ${res.status}.` });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, data: { username: data.login } });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not connect to GitHub." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create Vercel verification route**

Create `packages/unpress-wizard/src/app/api/verify/vercel/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token is required" }, { status: 400 });
    }

    const res = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) return NextResponse.json({ ok: false, error: "Invalid token. Make sure you copied the full token." });
      return NextResponse.json({ ok: false, error: `Vercel returned ${res.status}.` });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, data: { username: data.user?.username || data.user?.name || "connected" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not connect to Vercel." }, { status: 500 });
  }
}
```

- [ ] **Step 5: Verify build**

Run: `cd packages/unpress-wizard && pnpm build`
Expected: Build succeeds, API routes registered

- [ ] **Step 6: Commit**

```bash
git add packages/unpress-wizard/src/app/api/
git commit -m "feat: add verification API routes — WordPress, Sanity, GitHub, Vercel"
```

---

### Task 7: Create Steps 2–5 (Connect WP, Sanity, GitHub, Vercel)

**Files:**
- Create: `packages/unpress-wizard/src/components/steps/step2-connect-wordpress.tsx`
- Create: `packages/unpress-wizard/src/components/steps/step3-setup-sanity.tsx`
- Create: `packages/unpress-wizard/src/components/steps/step4-setup-github.tsx`
- Create: `packages/unpress-wizard/src/components/steps/step5-setup-vercel.tsx`
- Modify: `packages/unpress-wizard/src/app/step/[step]/page.tsx`

- [ ] **Step 1: Create Step 2 — Connect WordPress**

Create `packages/unpress-wizard/src/components/steps/step2-connect-wordpress.tsx`:

```tsx
"use client";

import { InstructionCard } from "@/components/instruction-card";
import { InputField } from "@/components/input-field";
import { VerifyButton } from "@/components/verify-button";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step2Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

export function Step2ConnectWordPress({ level, state, onUpdate, onComplete }: Step2Props) {
  const handleVerify = async () => {
    if (!state.wp_auth_token) return { ok: false, message: "Please enter your auth token." };
    if (!state.wp_url) return { ok: false, message: "WordPress URL missing. Go back to Step 1." };

    try {
      const res = await fetch("/api/verify/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.wp_url, token: state.wp_auth_token }),
      });
      const data = await res.json();

      if (data.ok) {
        onUpdate({
          wp_verified: true,
          wp_manifest_summary: {
            posts: data.data.posts,
            pages: data.data.pages,
            media: data.data.media,
            plugins: data.data.plugins,
          },
        });
        onComplete();
        return { ok: true, message: `Connected! Found ${data.data.posts} posts, ${data.data.pages} pages, ${data.data.media} media files.` };
      }
      return { ok: false, message: data.error || "Verification failed." };
    } catch {
      return { ok: false, message: "Network error. Check your connection and try again." };
    }
  };

  return (
    <div className="space-y-6">
      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "Go to your <strong>WordPress admin panel</strong> (yourdomain.com/wp-admin)",
          "In the left sidebar, click <strong>&quot;Unpress&quot;</strong>",
          "Check the <strong>consent checkbox</strong> to confirm you want to migrate",
          "Copy the <strong>Migration Token</strong> shown on the page",
          "Paste it below and click Verify",
        ]}
        callout={{
          icon: "🔒",
          text: "<strong>This token is read-only</strong> — it lets Unpress read your content but cannot modify anything on your site. The token expires after 1 hour.",
        }}
      />

      <div className="space-y-4">
        {state.wp_url && (
          <InputField
            label="WordPress URL"
            value={state.wp_url}
            onChange={() => {}}
            readOnly
          />
        )}
        <InputField
          label="Migration Token"
          value={state.wp_auth_token || ""}
          onChange={(v) => onUpdate({ wp_auth_token: v })}
          placeholder="Paste your token here"
          type="password"
          required
        />
        <VerifyButton
          onVerify={handleVerify}
          nextHref={`/step/3?level=${level}`}
          label="Verify Token"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Step 3 — Setup Sanity**

Create `packages/unpress-wizard/src/components/steps/step3-setup-sanity.tsx`:

```tsx
"use client";

import { InstructionCard } from "@/components/instruction-card";
import { InputField } from "@/components/input-field";
import { VerifyButton } from "@/components/verify-button";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step3Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

export function Step3SetupSanity({ level, state, onUpdate, onComplete }: Step3Props) {
  const handleVerify = async () => {
    if (!state.sanity_project_id || !state.sanity_token) {
      return { ok: false, message: "Please fill in Project ID and API Token." };
    }

    try {
      const res = await fetch("/api/verify/sanity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: state.sanity_project_id,
          dataset: state.sanity_dataset || "production",
          token: state.sanity_token,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        onUpdate({ sanity_verified: true });
        onComplete();
        return { ok: true, message: `Connected to Sanity project!` };
      }
      return { ok: false, message: data.error || "Verification failed." };
    } catch {
      return { ok: false, message: "Could not connect to Sanity." };
    }
  };

  return (
    <div className="space-y-6">
      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "Go to <a href='https://www.sanity.io/manage' target='_blank' rel='noopener' class='text-[#D4603A] underline'>sanity.io/manage</a> and sign in (or create an account — <strong>signing in with GitHub is fastest</strong>)",
          "Click <strong>&quot;Create project&quot;</strong> and give it a name (e.g., &quot;My Website&quot;)",
          "Copy the <strong>Project ID</strong> from the project dashboard",
          "Go to <strong>API → Tokens → Add API Token</strong>, name it &quot;Unpress&quot;, set permissions to <strong>Editor</strong>",
          "Copy the token and paste it below",
        ]}
        callout={{
          icon: "💡",
          text: "<strong>What is Sanity?</strong> Sanity is your new content editor — like WordPress admin but faster and AI-ready. Your posts, pages, and media will live here after migration.",
        }}
      />

      <div className="space-y-4">
        <InputField
          label="Sanity Project ID"
          value={state.sanity_project_id || ""}
          onChange={(v) => onUpdate({ sanity_project_id: v })}
          placeholder="e.g., abc123de"
          required
        />
        <InputField
          label="Dataset"
          value={state.sanity_dataset || "production"}
          onChange={(v) => onUpdate({ sanity_dataset: v })}
          placeholder="production"
          helper="Leave as 'production' unless you know what you're doing"
        />
        <InputField
          label="API Token"
          value={state.sanity_token || ""}
          onChange={(v) => onUpdate({ sanity_token: v })}
          placeholder="Paste your Sanity API token"
          type="password"
          required
        />
        <VerifyButton
          onVerify={handleVerify}
          nextHref={`/step/4?level=${level}`}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Step 4 — Setup GitHub**

Create `packages/unpress-wizard/src/components/steps/step4-setup-github.tsx`:

```tsx
"use client";

import { InstructionCard } from "@/components/instruction-card";
import { InputField } from "@/components/input-field";
import { VerifyButton } from "@/components/verify-button";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step4Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

export function Step4SetupGitHub({ level, state, onUpdate, onComplete }: Step4Props) {
  const handleVerify = async () => {
    if (!state.github_token) return { ok: false, message: "Please enter your GitHub token." };

    try {
      const res = await fetch("/api/verify/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: state.github_token }),
      });
      const data = await res.json();

      if (data.ok) {
        onUpdate({ github_verified: true, github_username: data.data.username });
        onComplete();
        return { ok: true, message: `Connected as @${data.data.username}!` };
      }
      return { ok: false, message: data.error || "Verification failed." };
    } catch {
      return { ok: false, message: "Could not connect to GitHub." };
    }
  };

  return (
    <div className="space-y-6">
      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "Go to <a href='https://github.com/settings/tokens' target='_blank' rel='noopener' class='text-[#D4603A] underline'>github.com/settings/tokens</a> (sign up if you don&apos;t have an account)",
          "Click <strong>&quot;Generate new token (classic)&quot;</strong>",
          "Give it a name like <strong>&quot;Unpress Migration&quot;</strong>",
          "Select scopes: <strong>repo</strong> and <strong>workflow</strong>",
          "Click <strong>&quot;Generate token&quot;</strong> and copy it immediately (you won&apos;t see it again!)",
        ]}
        callout={{
          icon: "💡",
          text: "<strong>What is GitHub?</strong> GitHub is where your website&apos;s code will live. Think of it as a safe vault for your site — every change is tracked and can be undone.",
        }}
      />

      <div className="space-y-4">
        <InputField
          label="GitHub Personal Access Token"
          value={state.github_token || ""}
          onChange={(v) => onUpdate({ github_token: v })}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          type="password"
          required
        />
        <VerifyButton
          onVerify={handleVerify}
          nextHref={`/step/5?level=${level}`}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Step 5 — Setup Vercel**

Create `packages/unpress-wizard/src/components/steps/step5-setup-vercel.tsx`:

```tsx
"use client";

import { InstructionCard } from "@/components/instruction-card";
import { InputField } from "@/components/input-field";
import { VerifyButton } from "@/components/verify-button";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step5Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

export function Step5SetupVercel({ level, state, onUpdate, onComplete }: Step5Props) {
  const handleVerify = async () => {
    if (!state.vercel_token) return { ok: false, message: "Please enter your Vercel token." };

    try {
      const res = await fetch("/api/verify/vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: state.vercel_token }),
      });
      const data = await res.json();

      if (data.ok) {
        onUpdate({ vercel_verified: true, vercel_username: data.data.username });
        onComplete();
        return { ok: true, message: `Connected to Vercel as ${data.data.username}!` };
      }
      return { ok: false, message: data.error || "Verification failed." };
    } catch {
      return { ok: false, message: "Could not connect to Vercel." };
    }
  };

  return (
    <div className="space-y-6">
      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "Go to <a href='https://vercel.com' target='_blank' rel='noopener' class='text-[#D4603A] underline'>vercel.com</a> and sign in (<strong>signing in with GitHub is fastest</strong>)",
          "Click your avatar → <strong>Settings</strong> → <strong>Tokens</strong>",
          "Click <strong>&quot;Create Token&quot;</strong>, name it <strong>&quot;Unpress&quot;</strong>",
          "Set scope to <strong>&quot;Full Account&quot;</strong>",
          "Copy the token and paste it below",
        ]}
        callout={{
          icon: "💡",
          text: "<strong>What is Vercel?</strong> Vercel is where your website goes live — it&apos;s like your hosting but 10x faster. Your site will be available at yourproject.vercel.app within seconds of deployment.",
        }}
      />

      <div className="space-y-4">
        <InputField
          label="Vercel Access Token"
          value={state.vercel_token || ""}
          onChange={(v) => onUpdate({ vercel_token: v })}
          placeholder="Paste your Vercel token"
          type="password"
          required
        />
        <VerifyButton
          onVerify={handleVerify}
          nextHref={`/step/6?level=${level}`}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire steps 2–5 into the dynamic route**

Edit `packages/unpress-wizard/src/app/step/[step]/page.tsx` — add imports at top:

```typescript
import { Step2ConnectWordPress } from "@/components/steps/step2-connect-wordpress";
import { Step3SetupSanity } from "@/components/steps/step3-setup-sanity";
import { Step4SetupGitHub } from "@/components/steps/step4-setup-github";
import { Step5SetupVercel } from "@/components/steps/step5-setup-vercel";
```

Replace the placeholder lines for steps 2–5:

```tsx
      {stepNum === 2 && <Step2ConnectWordPress {...stepProps} />}
      {stepNum === 3 && <Step3SetupSanity {...stepProps} />}
      {stepNum === 4 && <Step4SetupGitHub {...stepProps} />}
      {stepNum === 5 && <Step5SetupVercel {...stepProps} />}
```

- [ ] **Step 6: Verify build**

Run: `cd packages/unpress-wizard && pnpm build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add packages/unpress-wizard/src/components/steps/ packages/unpress-wizard/src/app/step/
git commit -m "feat: add wizard steps 2-5 — connect WP, Sanity, GitHub, Vercel"
```

---

## Chunk 3: Steps 6–7 + E2E Tests + Final Integration

### Task 8: Create Steps 6–7 (Design Inspiration + Review & Launch)

**Files:**
- Create: `packages/unpress-wizard/src/components/steps/step6-design-inspiration.tsx`
- Create: `packages/unpress-wizard/src/components/steps/step7-review-launch.tsx`
- Modify: `packages/unpress-wizard/src/app/step/[step]/page.tsx`

- [ ] **Step 1: Create Step 6 — Design Inspiration**

Create `packages/unpress-wizard/src/components/steps/step6-design-inspiration.tsx`:

```tsx
"use client";

import { useState } from "react";
import { InputField } from "@/components/input-field";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";
import Link from "next/link";

interface Step6Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

const PRIVATE_PATTERNS = /^https?:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|169\.254\.)/i;

export function Step6DesignInspiration({ level, state, onUpdate, onComplete }: Step6Props) {
  const [urls, setUrls] = useState<string[]>(state.inspiration_urls || ["", "", "", "", ""]);
  const [error, setError] = useState("");

  const updateUrl = (index: number, value: string) => {
    const next = [...urls];
    next[index] = value;
    setUrls(next);
  };

  const handleContinue = () => {
    const filled = urls.filter((u) => u.trim() !== "");

    if (filled.length < 3) {
      setError("Please enter at least 3 website URLs.");
      return;
    }

    for (const url of filled) {
      if (!url.startsWith("https://")) {
        setError(`URLs must start with https:// — check: ${url}`);
        return;
      }
      if (PRIVATE_PATTERNS.test(url)) {
        setError(`Private/local URLs are not allowed: ${url}`);
        return;
      }
    }

    setError("");
    onUpdate({ inspiration_urls: filled });
    onComplete();
  };

  const filledCount = urls.filter((u) => u.trim() !== "").length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#e8ddd3] p-6">
        <h3 className="text-sm font-semibold mb-1">🎨 Share your taste</h3>
        <p className="text-sm text-[#6b6058] leading-relaxed mb-6">
          Share 3–5 websites whose design you love. We&apos;ll analyze their visual DNA — colors,
          fonts, layout, vibe — and create something that matches your taste. Not a generic template.
        </p>

        <div className="space-y-3">
          {urls.map((url, i) => (
            <InputField
              key={i}
              label={`Website ${i + 1}${i < 3 ? "" : " (optional)"}`}
              value={url}
              onChange={(v) => updateUrl(i, v)}
              placeholder="https://example.com"
              type="url"
              required={i < 3}
            />
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[#fef2f2] border border-[#ef4444] rounded-xl text-sm text-[#991b1b] flex items-start gap-2">
            <span>❌</span> {error}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleContinue}
          disabled={filledCount < 3}
          className="px-6 py-3 bg-[#D4603A] text-white rounded-xl font-semibold text-sm hover:bg-[#b8502f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
        {filledCount >= 3 && !error && state.inspiration_urls && (
          <Link
            href={`/step/7?level=${level}`}
            className="px-6 py-3 bg-[#22c55e] text-white rounded-xl font-semibold text-sm hover:bg-[#16a34a] transition-colors"
          >
            Continue →
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Step 7 — Review & Launch**

Create `packages/unpress-wizard/src/components/steps/step7-review-launch.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step7Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
  onClearTokens: () => void;
}

export function Step7ReviewLaunch({ level, state, onComplete, onClearTokens }: Step7Props) {
  const [launched, setLaunched] = useState(false);

  const allVerified = state.wp_verified && state.sanity_verified && state.github_verified && state.vercel_verified && (state.inspiration_urls?.length ?? 0) >= 3;

  const configBlob = {
    tool: "unpress_start",
    params: {
      wp_url: state.wp_url,
      wp_auth_token: "••••••••",
      sanity_project_id: state.sanity_project_id,
      sanity_dataset: state.sanity_dataset || "production",
      sanity_token: "••••••••",
      github_token: "••••••••",
      vercel_token: "••••••••",
      inspiration_urls: state.inspiration_urls,
      skill_level: state.level,
    },
  };

  // Full config with real tokens (for copying)
  const fullConfig = JSON.stringify({
    tool: "unpress_start",
    params: {
      wp_url: state.wp_url,
      wp_auth_token: state.wp_auth_token,
      sanity_project_id: state.sanity_project_id,
      sanity_dataset: state.sanity_dataset || "production",
      sanity_token: state.sanity_token,
      github_token: state.github_token,
      vercel_token: state.vercel_token,
      inspiration_urls: state.inspiration_urls,
      skill_level: state.level,
    },
  }, null, 2);

  const handleLaunch = () => {
    setLaunched(true);
    onComplete();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullConfig);
    onClearTokens(); // Security: clear tokens after copying
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-3">
        <SummaryCard icon="🔌" label="WordPress" value={state.wp_url || "—"} verified={state.wp_verified} detail={state.wp_manifest_summary ? `${state.wp_manifest_summary.posts} posts, ${state.wp_manifest_summary.pages} pages, ${state.wp_manifest_summary.media} media` : undefined} />
        <SummaryCard icon="📦" label="Sanity CMS" value={state.sanity_project_id || "—"} verified={state.sanity_verified} detail={`Dataset: ${state.sanity_dataset || "production"}`} />
        <SummaryCard icon="🐙" label="GitHub" value={state.github_username ? `@${state.github_username}` : "—"} verified={state.github_verified} />
        <SummaryCard icon="▲" label="Vercel" value={state.vercel_username || "—"} verified={state.vercel_verified} />
        <SummaryCard icon="🎨" label="Design Inspiration" value={`${state.inspiration_urls?.length || 0} sites`} verified={(state.inspiration_urls?.length ?? 0) >= 3} />
      </div>

      {!launched ? (
        <div className="space-y-4">
          <div className="bg-[#fef9f0] border border-[#f0dfc8] rounded-xl p-4 text-sm text-[#6b6058] leading-relaxed">
            <strong className="text-[#1a1a1a]">What happens next:</strong> Unpress will scan your content, migrate it to Sanity, generate your new site based on your design preferences, and deploy it. You&apos;ll be able to preview everything before it goes live.
          </div>

          <button
            onClick={handleLaunch}
            disabled={!allVerified}
            className="w-full py-4 bg-[#D4603A] text-white rounded-2xl font-bold text-lg hover:bg-[#b8502f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Start Migration
          </button>

          {!allVerified && (
            <p className="text-sm text-[#991b1b] text-center">Complete all steps above before launching.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#f0fdf4] border-2 border-[#22c55e] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#166534] mb-2">✅ Configuration Ready!</h3>
            <p className="text-sm text-[#3d352e] mb-4">
              Copy the configuration below and paste it into your Claude conversation to start the migration.
            </p>
            <pre className="bg-[#1a1a1a] text-[#F5F0EB] p-4 rounded-xl text-xs overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(configBlob, null, 2)}
            </pre>
            <button
              onClick={handleCopy}
              className="mt-4 px-6 py-3 bg-[#D4603A] text-white rounded-xl font-semibold text-sm hover:bg-[#b8502f] transition-colors"
            >
              📋 Copy Full Config (with tokens)
            </button>
            <p className="text-xs text-[#8a7d72] mt-2">
              Tokens will be cleared from this browser after copying for security.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, verified, detail }: { icon: string; label: string; value: string; verified?: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[#e8ddd3] rounded-xl p-4">
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#8a7d72] font-medium uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
        {detail && <div className="text-xs text-[#8a7d72]">{detail}</div>}
      </div>
      <span className="text-lg">{verified ? "✅" : "⏳"}</span>
    </div>
  );
}
```

- [ ] **Step 3: Wire steps 6–7 into the dynamic route**

Edit `packages/unpress-wizard/src/app/step/[step]/page.tsx` — add imports:

```typescript
import { Step6DesignInspiration } from "@/components/steps/step6-design-inspiration";
import { Step7ReviewLaunch } from "@/components/steps/step7-review-launch";
```

Replace placeholder lines for steps 6–7:

```tsx
      {stepNum === 6 && <Step6DesignInspiration {...stepProps} />}
      {stepNum === 7 && <Step7ReviewLaunch {...stepProps} onClearTokens={clearTokens} />}
```

Also add `clearTokens` to the destructured `useWizardState` call:

```tsx
const { state, hydrated, update, markStepComplete, clearTokens } = useWizardState(level);
```

- [ ] **Step 4: Remove the PlaceholderStep component** (no longer needed)

Delete the `PlaceholderStep` function from the page.tsx file.

- [ ] **Step 5: Verify build**

Run: `cd packages/unpress-wizard && pnpm build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add packages/unpress-wizard/src/
git commit -m "feat: add wizard steps 6-7 — design inspiration and review & launch"
```

---

### Task 9: Add Playwright E2E Tests

**Files:**
- Create: `packages/unpress-wizard/playwright.config.ts`
- Create: `packages/unpress-wizard/e2e/wizard-flow.spec.ts`
- Modify: `packages/unpress-wizard/package.json`

- [ ] **Step 1: Install Playwright**

Run:
```bash
cd packages/unpress-wizard && pnpm add -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Create Playwright config**

Create `packages/unpress-wizard/playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3456",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3456",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

- [ ] **Step 3: Create E2E test file**

Create `packages/unpress-wizard/e2e/wizard-flow.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Wizard Flow", () => {
  test("welcome page renders with all skill levels", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Move your WordPress site to the future");
    await expect(page.locator("text=Your WordPress site stays untouched")).toBeVisible();
    await expect(page.locator("text=Novice")).toBeVisible();
    await expect(page.locator("text=Medium")).toBeVisible();
    await expect(page.locator("text=Expert")).toBeVisible();
  });

  test("novice level navigates to step 1 without 404", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Novice");
    await expect(page).toHaveURL(/\/step\/1\?level=novice/);
    await expect(page.locator("text=Step 1 of 7")).toBeVisible();
    await expect(page.locator("text=Install WP Plugin")).toBeVisible();
  });

  test("medium level navigates to step 1", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Medium");
    await expect(page).toHaveURL(/\/step\/1\?level=medium/);
    await expect(page.locator("text=Step 1 of 7")).toBeVisible();
  });

  test("expert level navigates to step 1", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Expert");
    await expect(page).toHaveURL(/\/step\/1\?level=expert/);
    await expect(page.locator("text=Step 1 of 7")).toBeVisible();
  });

  test("all 7 steps render without errors", async ({ page }) => {
    for (let step = 1; step <= 7; step++) {
      await page.goto(`/step/${step}?level=novice`);
      await expect(page.locator(`text=Step ${step} of 7`)).toBeVisible();
    }
  });

  test("nav bar shows correct skill badge for each level", async ({ page }) => {
    await page.goto("/step/1?level=novice");
    await expect(page.locator("text=🌱 Novice")).toBeVisible();

    await page.goto("/step/1?level=medium");
    await expect(page.locator("text=⚡ Medium")).toBeVisible();

    await page.goto("/step/1?level=expert");
    await expect(page.locator("text=🚀 Expert")).toBeVisible();
  });

  test("step 1 shows verify button and URL input", async ({ page }) => {
    await page.goto("/step/1?level=novice");
    await expect(page.locator("text=Your WordPress Site URL")).toBeVisible();
    await expect(page.locator("text=Verify Connection")).toBeVisible();
  });

  test("step 1 expert mode hides instructions", async ({ page }) => {
    await page.goto("/step/1?level=expert");
    // Expert should not show the instruction card
    await expect(page.locator("text=📋 Instructions")).not.toBeVisible();
    // But should show the input
    await expect(page.locator("text=Your WordPress Site URL")).toBeVisible();
  });

  test("back navigation works between steps", async ({ page }) => {
    await page.goto("/step/3?level=novice");
    await page.click("text=← Back to Step 2");
    await expect(page).toHaveURL(/\/step\/2\?level=novice/);
  });

  test("step 6 requires at least 3 URLs", async ({ page }) => {
    await page.goto("/step/6?level=novice");
    await expect(page.locator("text=Share your taste")).toBeVisible();
    // Continue button should be disabled with 0 URLs
    const continueBtn = page.locator("button:has-text('Continue')");
    await expect(continueBtn).toBeDisabled();
  });

  test("step 7 shows summary cards", async ({ page }) => {
    await page.goto("/step/7?level=novice");
    await expect(page.locator("text=WordPress")).toBeVisible();
    await expect(page.locator("text=Sanity CMS")).toBeVisible();
    await expect(page.locator("text=GitHub")).toBeVisible();
    await expect(page.locator("text=Vercel")).toBeVisible();
    await expect(page.locator("text=Design Inspiration")).toBeVisible();
  });

  test("invalid step shows error", async ({ page }) => {
    await page.goto("/step/99?level=novice");
    await expect(page.locator("text=Step not found")).toBeVisible();
  });
});
```

- [ ] **Step 4: Update wizard package.json test script**

Edit `packages/unpress-wizard/package.json` — change test script:
```json
"test": "playwright test",
"test:e2e": "playwright test"
```

- [ ] **Step 5: Run E2E tests**

Run: `cd packages/unpress-wizard && npx playwright test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/unpress-wizard/playwright.config.ts packages/unpress-wizard/e2e/ packages/unpress-wizard/package.json
git commit -m "test: add Playwright E2E tests for wizard flow"
```

---

### Task 10: Final Build + Full Test Run + Push

**Files:**
- No new files

- [ ] **Step 1: Full monorepo build**

Run: `pnpm turbo build --force`
Expected: All packages build clean

- [ ] **Step 2: Run all tests**

Run: `pnpm turbo test`
Expected: All tests pass (vitest for backend packages, playwright for wizard)

- [ ] **Step 3: Verify wizard manually**

Run: `pnpm start`
Expected: Browser opens at localhost:3456, welcome page loads, clicking any skill level navigates to step 1 (no 404), all 7 steps render, back navigation works

- [ ] **Step 4: Commit any final fixes and push**

```bash
git push origin master
```

---

## Execution Summary

| Chunk | Tasks | What It Delivers |
|-------|-------|-----------------|
| 1 | Tasks 1–5 | Auto-launch, state hook, NavBar, shared components, step route + step 1 |
| 2 | Tasks 6–7 | API verification routes, steps 2–5 (WP connect, Sanity, GitHub, Vercel) |
| 3 | Tasks 8–10 | Steps 6–7 (inspiration, review/launch), E2E tests, final push |

**After this plan:** The wizard is fully functional with 7 steps, adaptive skill levels, verification APIs, token security, and E2E test coverage. Users can go from `git clone` → `pnpm start` → complete wizard → get MCP config.
