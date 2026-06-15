<div align="center">

# Chimeraforge

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[Live Site](https://chimeraforge.vercel.app) | [Issues](https://github.com/Sahil170595/Banterblogs/issues)

</div>

---

## Overview

This is the Next.js application that powers [chimeraforge.vercel.app](https://chimeraforge.vercel.app). It serves as the development log and research archive for the Chimera ecosystem — a constitutional AI enforcement architecture spanning 9 repositories across Python, Rust, TypeScript, C#, and JavaScript.

The site publishes three types of content:

- **Episodes** — narrative write-ups generated from git commits. Each episode is a roundtable discussion between four AI personas (Banterpacks, Claude, ChatGPT, Gemini) covering what changed and why. 266 episodes across Banterpacks (193) and Chimera Engine (73).
- **Research reports** — technical benchmarks on LLM performance, quantization, inference optimization, constitutional AI, and safety evaluation. 50 reports with 1.12M+ empirical measurements.
- **Papers** — independent research write-ups. 1 paper accepted at the ICML 2026 Workshop on Hypothesis Testing, 5 under peer review, 5 in preparation.

Headline counts (episodes / reports / measurements) are single-sourced from `src/lib/constants.ts` — update there, not in this README.

---

## Architecture

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 Server Components, Static Site Generation + ISR |
| Language | TypeScript 5.9 (strict mode) |
| Styling | Tailwind CSS 3.4, Framer Motion 12, Radix UI primitives |
| Markdown | remark, rehype, highlight.js |
| Search | Fuse.js |
| Fonts | Manrope (body), Space Grotesk (headings), JetBrains Mono (code) |
| Testing | Vitest + Testing Library |
| Analytics | Vercel Analytics + Speed Insights |
| Hosting | Vercel |

### Design System

The site uses a custom dark theme called "Obsidian & Aurora" — defined through CSS variables in `globals.css`. Key characteristics:

- High-contrast dark palette with ember (primary) and cyan (accent) highlights
- Backdrop blur on panels and cards
- Magnetic cursor interactions on buttons and episode cards
- Framer Motion transitions throughout

### Report Pipeline

Reports flow through a multi-stage pipeline:

1. **Discovery** (`lib/reports/locator.ts`) — scans `PublishReady/reports/` and `reports/` for markdown files and directory-based reports with `meta.json` metadata.
2. **Rendering** (`app/reports/[id]/page.tsx`) — server-renders markdown with syntax highlighting and serves it with ISR (15-minute revalidation).

Reports can be standalone markdown files or directories containing `meta.json`, a markdown body, and optional chart data.

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with episode highlights and platform stats |
| `/episodes` | Searchable, filterable list of all episodes across both lines |
| `/episodes/[slug]` | Individual episode with reading progress, social sharing |
| `/banterpacks` | Banterpacks-only episode timeline (production monorepo) |
| `/chimera` | Chimera Engine episode timeline (constitutional AI debate engine) |
| `/reports` | Research report archive |
| `/reports/[id]` | Individual report with prev/next navigation |
| `/reports/compendium` | Full research compendium reader |
| `/reports.json` | Machine-readable manifest of every report (build-time generated) |
| `/papers` | Independent research papers — accepted, under review, in preparation |
| `/work` | CV-style page — experience, education, skills, open-source |
| `/show` | Interactive scenes from the Chimera ecosystem (BFT, ZK, cognitive agents, provenance, streaming ladder) |
| `/show/[slug]` | Individual interactive scene |
| `/platform` | Overview of the nine Chimera ecosystem repositories |
| `/about` | Project background and character introductions |
| `/tags` | Browse episodes by tag |
| `/roadmap` | Development roadmap |
| `/benchmarks` | Redirect → `/reports` (legacy) |
| `/technology` | Redirect → `/platform` (legacy) |
| `/sitemap.xml` | XML sitemap with XSLT stylesheet |
| `/rss.xml` | RSS feed with XSLT stylesheet |
| `/api/webhook` | HMAC-authenticated revalidation endpoint |

---

## Development

### Prerequisites

- Node.js 18.17+
- npm

### Setup

```bash
git clone https://github.com/Sahil170595/Banterblogs.git
cd Banterblogs/banterblogs-nextjs
npm install
cp env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Purpose |
|---|---|
| `WEBHOOK_SECRET_TOKEN` | Authenticates the `/api/webhook` revalidation endpoint |
| `REPORTS_ENABLED` | Set to `true` to enable the research hub |
| `GITHUB_TOKEN` | Optional, for GitHub API integration |

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build (also validates all markdown and report data) |
| `npm run lint` | ESLint check |
| `npm run test` | Run Vitest test suites |

---

## Adding Content

### New Episode

Create a markdown file in `posts/banterpacks/` named `episode-XXX.md`:

```markdown
---
title: "Episode 100: Title Here"
subtitle: "Brief description"
date: "2025-11-25"
tags: ["ai", "architecture"]
---

**Banterpacks:** Opening line.
**Claude:** Response.
```

### New Report

Create a directory in `PublishReady/reports/your-report/`:

```
your-report/
  meta.json          # { "title": "...", "description": "...", "tags": [...] }
  SUMMARY.md         # Report content in markdown
  charts/            # Optional JSON data for interactive charts
```

Generic filenames (`README.md`, `SUMMARY.md`, `index.md`) are disambiguated by their parent directory. Use unique filenames for specific slugs.

---

## License

MIT. See [LICENSE](../LICENSE).
