<div align="center">

# Banterblogs

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[Live Site](https://banterblogs.vercel.app) | [Issues](https://github.com/Sahil170595/Banterblogs/issues)

</div>

---

## Overview

This is the Next.js application that powers [banterblogs.vercel.app](https://banterblogs.vercel.app). It serves as the development log and research archive for the Chimera ecosystem — a suite of repositories building real-time AI tools for streamers.

The site publishes two types of content:

- **Episodes** — narrative write-ups generated from git commits. Each episode is a roundtable discussion between four AI personas (Banterpacks, Claude, ChatGPT, Gemini) covering what changed and why.
- **Research reports** — technical benchmarks on LLM performance, quantization, inference optimization, and multi-agent orchestration. 60+ reports with 70,000+ data points.

---

## Architecture

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React Server Components, Static Site Generation |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 3.4, Framer Motion |
| Markdown | remark, rehype, highlight.js |
| Search | Fuse.js |
| Fonts | Manrope (body), Space Grotesk (headings), JetBrains Mono (code) |
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
| `/episodes` | Searchable, filterable list of all 266+ episodes |
| `/episodes/[slug]` | Individual episode with reading progress, social sharing |
| `/reports` | Research report archive |
| `/reports/[id]` | Individual report with prev/next navigation |
| `/reports/compendium` | Full research compendium reader |
| `/platform` | Overview of the six Chimera ecosystem repositories |
| `/about` | Project background and character introductions |
| `/tags` | Browse episodes by tag |
| `/roadmap` | Development roadmap |
| `/sitemap.xml` | XML sitemap with XSLT stylesheet |
| `/rss.xml` | RSS feed with XSLT stylesheet |

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
