<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo.svg">
    <img alt="Unpress" src="docs/assets/logo.svg" width="480">
  </picture>
</p>

<p align="center">
  <strong>Migrate your WordPress site to a modern AI-powered stack — in minutes, not months.</strong>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/Quick_Start-D4603A?style=for-the-badge&logoColor=white" alt="Quick Start"></a>
  <a href="https://github.com/baldiga/unpress/blob/master/LICENSE"><img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" alt="MIT License"></a>
  <a href="https://github.com/baldiga/unpress/pulls"><img src="https://img.shields.io/badge/PRs-Welcome-6366f1?style=for-the-badge" alt="PRs Welcome"></a>
</p>

<p align="center">
  <a href="#-what-is-unpress">What is Unpress?</a> &bull;
  <a href="#-features">Features</a> &bull;
  <a href="#%EF%B8%8F-architecture">Architecture</a> &bull;
  <a href="#-quick-start">Quick Start</a> &bull;
  <a href="#-how-it-works">How It Works</a> &bull;
  <a href="#-contributing">Contributing</a>
</p>

---

## What is Unpress?

**Unpress** is an open-source [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that migrates WordPress websites to a modern, AI-powered stack:

| From | To |
|:-----|:---|
| WordPress + PHP + MySQL | **Next.js** + **Sanity CMS** + **Vercel** |
| Manual theme editing | **AI co-pilot** that changes your site on command |
| $5–80/mo hosting | **Free tier** for most sites |

After migration, Claude stays as your **site co-pilot** — say *"Change my header color"* or *"Add a testimonials section"* and it just happens.

<br>

## Features

<table>
<tr>
<td width="50%">

### 🔒 Safe & Non-Destructive
Your WordPress site stays **completely untouched**. Unpress only reads and copies content — it never modifies, deletes, or touches your live site.

### 🧠 Adaptive Onboarding
Three experience levels adapt the entire wizard:
- 🌱 **Novice** — Full guidance with screenshots
- ⚡ **Medium** — Key steps, less hand-holding
- 🚀 **Expert** — Just the input fields

</td>
<td width="50%">

### 🎨 Inspiration-Driven Design
Share 3–5 websites you love. Unpress analyzes their visual DNA (colors, fonts, layout, vibe) and generates a site that matches your taste — not a generic template.

### 🤖 AI Co-Pilot (Post-Migration)
Once deployed, Claude can modify your site on demand:
- *"Make the footer dark"*
- *"Add a pricing page"*
- *"Optimize for mobile"*

</td>
</tr>
</table>

<table>
<tr>
<td width="33%" align="center">
<br>

**💰 Cost Calculator**

Shows exactly what you'll pay (usually $0) with side-by-side WP hosting comparison

<br>
</td>
<td width="33%" align="center">
<br>

**🔄 301 Redirect Map**

Auto-generates SEO-preserving redirects from old WordPress URLs to new routes

<br>
</td>
<td width="33%" align="center">
<br>

**👀 Preview Gate**

See your entire site before it goes live — approve or request changes

<br>
</td>
</tr>
</table>

<br>

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Server (unpress)                   │
│                                                           │
│  10 Tools: start · status · rollback · scan · wizard     │
│            decide · migrate · design · deploy · copilot  │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│  Scan    │ Migrate  │ Design   │ Deploy   │  Copilot     │
│  Phase   │ Phase    │ Phase    │ Phase    │  Phase       │
│          │          │          │          │              │
│ WP Client│ HTML→PT  │ Inspira- │ GitHub   │ Site changes │
│ Cost Est │ Schemas  │ tion AI  │ Vercel   │ on demand    │
│ Manifest │ Media    │ Site Gen │ DNS      │              │
│          │ Redirect │          │          │              │
└──────────┴──────────┴──────────┴──────────┴──────────────┘
        ▲                                        │
        │         ┌──────────────┐               │
        └─────────│  WordPress   │               ▼
                  │   Plugin     │     ┌───────────────────┐
                  │  (scanner)   │     │  Generated Site    │
                  └──────────────┘     │  Next.js + Sanity  │
                                       │  + Vercel          │
                                       └───────────────────┘
```

### Monorepo Structure

```
packages/
  shared/            → Types: Manifest, Phase, Checkpoint, Config, Errors
  unpress/           → MCP server orchestrator (10 tools)
  unpress-scan/      → WordPress scanning + cost estimation
  unpress-migrate/   → Content migration pipeline
  unpress-wizard/    → Next.js onboarding UI
  unpress-design/    → Design phase (AI-powered)
  unpress-deploy/    → GitHub + Vercel deployment
  unpress-copilot/   → Post-migration AI co-pilot
plugins/
  unpress-wp/        → WordPress plugin (scanner + REST API + trust badge)
templates/
  next-sanity/       → Generated site template
```

### Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Language** | TypeScript (strict mode, ES2022, NodeNext) |
| **MCP Server** | `@modelcontextprotocol/sdk` |
| **Frontend** | Next.js 16 + Tailwind CSS + shadcn/ui |
| **CMS** | Sanity CMS (Portable Text, Studio) |
| **Hosting** | Vercel (free tier for most sites) |
| **WP Plugin** | PHP 8.0+, WordPress 6.0+ |
| **Testing** | Vitest (31 tests across 7 test files) |

<br>

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- A WordPress site you want to migrate

### Install

```bash
# Clone the repo
git clone https://github.com/baldiga/unpress.git
cd unpress

# Install dependencies
pnpm install

# Build all packages
pnpm turbo build

# Run tests
pnpm turbo test
```

### Use with Claude Desktop

Add to your Claude Desktop MCP config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "unpress": {
      "command": "node",
      "args": ["path/to/unpress/packages/unpress/dist/index.js"]
    }
  }
}
```

Then tell Claude: *"I want to migrate my WordPress site to a modern stack"* and it will guide you through the entire process.

<br>

## How It Works

<table>
<tr>
<td align="center" width="14%">
<br>

**Step 1**

🔌

Install WP Plugin

</td>
<td align="center" width="14%">
<br>

**Step 2**

🔗

Connect Site

</td>
<td align="center" width="14%">
<br>

**Step 3**

📦

Set Up Sanity

</td>
<td align="center" width="14%">
<br>

**Step 4**

🐙

Set Up GitHub

</td>
<td align="center" width="14%">
<br>

**Step 5**

▲

Set Up Vercel

</td>
<td align="center" width="14%">
<br>

**Step 6**

🎨

Pick Design

</td>
<td align="center" width="14%">
<br>

**Step 7**

🚀

Launch!

</td>
</tr>
</table>

1. **Install the WordPress plugin** — scans your content, creates a secure read-only connection
2. **Connect your site** — enter your URL, Unpress verifies the connection and shows what it found
3. **Set up services** — Sanity (your new CMS), GitHub (your code), Vercel (your hosting)
4. **Choose your design** — share websites you love, AI analyzes their visual DNA
5. **Review & launch** — preview everything before it goes live, approve with one click

The entire process takes **15–45 minutes** depending on site size.

<br>

## MCP Tools

| Tool | Description |
|:-----|:------------|
| `unpress_start` | Start or resume a migration session |
| `unpress_status` | Get current migration progress |
| `unpress_scan` | Scan WordPress site, generate manifest + cost estimate |
| `unpress_wizard` | Launch the onboarding wizard UI |
| `unpress_decide` | Submit user decisions for migration choices |
| `unpress_migrate` | Migrate content to Sanity CMS |
| `unpress_design` | Analyze inspiration sites + generate design |
| `unpress_deploy` | Deploy to GitHub + Vercel |
| `unpress_copilot` | Execute post-migration site changes |
| `unpress_rollback` | Mark session for rollback |

<br>

## Development

```bash
# Build all packages
pnpm turbo build

# Run all tests (31 tests)
pnpm turbo test

# Watch mode for development
pnpm turbo dev

# Clean all build artifacts
pnpm turbo clean

# Lint
pnpm turbo lint
```

### Package Dependencies

```
@unpress/shared (types)
    ├── @unpress/scan
    ├── @unpress/migrate
    ├── @unpress/design
    ├── @unpress/deploy
    ├── @unpress/copilot
    ├── @unpress/wizard
    └── unpress (MCP server) ← imports all phase packages
```

<br>

## Roadmap

- [x] Core monorepo + shared types
- [x] MCP server with 10 tools
- [x] WordPress plugin (scanner, REST API, trust badge)
- [x] Scan phase (WP client, cost calculator)
- [x] Migrate phase (HTML→Portable Text, schemas, media, redirects)
- [x] Wizard UI (welcome page, skill levels)
- [x] Design/Deploy/Copilot stubs
- [ ] Wizard steps 1–7 (full onboarding flow)
- [ ] Design phase — Playwright analysis + AI site generation
- [ ] Deploy phase — GitHub + Vercel API integration
- [ ] Copilot phase — post-migration site changes
- [ ] Live migration dashboard
- [ ] End-to-end integration testing
- [ ] WooCommerce support
- [ ] Multi-language support (WPML/Polylang)

<br>

## Contributing

Contributions are welcome! This is an open-source project and we'd love your help.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Write tests for your changes
4. Make sure all tests pass (`pnpm turbo test`)
5. Open a PR

<br>

## License

MIT License. See [LICENSE](LICENSE) for details.

<br>

---

<p align="center">
  Built by <strong>Amir Baldiga</strong> &bull;
  <a href="https://linkedin.com/in/amirbaldiag">Connect on LinkedIn</a>
</p>

<p align="center">
  <sub>WordPress → AI-powered websites, one migration at a time.</sub>
</p>
