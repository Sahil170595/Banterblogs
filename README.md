<div align="center">

# Banterblogs

**Development log and research archive for the Chimera ecosystem.**

[![Live Site](https://img.shields.io/badge/Live-banterblogs.vercel.app-black?style=for-the-badge)](https://banterblogs.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Visit the site](https://banterblogs.vercel.app) · [Browse episodes](https://banterblogs.vercel.app/episodes) · [Read reports](https://banterblogs.vercel.app/reports)

</div>

---

## What is Banterblogs

Banterblogs is the public-facing site for the Chimera ecosystem — a group of repositories building real-time AI tools for streamers. The site publishes two things:

- **Episodes** — narrative write-ups generated from git commits across the ecosystem. Each episode is written as a roundtable discussion between four AI personas (Banterpacks, Claude, ChatGPT, Gemini), turning raw development activity into readable stories.
- **Research reports** — technical benchmarks covering LLM performance, quantization, inference optimization, and multi-agent orchestration. Over 60 reports spanning 70,000+ measurements across 26 technical papers.

The site is live at [banterblogs.vercel.app](https://banterblogs.vercel.app) with 266 episodes and counting.

---

## The Chimera Ecosystem

Banterblogs documents work across six repositories:

| Repository | Purpose |
|---|---|
| **Banterpacks** | Real-time AI overlay for streamers. Multi-LLM routing, speech interfaces, OBS rendering. |
| **Banterhearts** | ML backbone. Feedback ingestion, RLHF pipelines, quantized model deployment. |
| **Chimeraforge** | Capacity planning and infrastructure tooling. |
| **Chimera Multi-Agent** | Pipeline orchestration across agents and backends. |
| **Chimeradroid** | Mobile extension of the platform. |
| **Banterblogs** | This repository. The documentation and research layer. |

---

## Repository Structure

```
Banterblogs/
  banterblogs-nextjs/     # The active Next.js application
    src/                  # App source (pages, components, lib)
    posts/                # 266 episode markdown files
    reports/              # Technical report data (benchmarks, analysis)
    PublishReady/         # Processed reports ready for rendering
  legacy_archive/         # Original static site (archived, read-only)
```

---

## Tech Stack

- **Next.js 15** (App Router) with React Server Components and Static Site Generation
- **TypeScript** in strict mode
- **Tailwind CSS 3.4** with a custom dark theme ("Obsidian & Aurora")
- **Framer Motion** for animations
- Markdown pipeline: remark, rehype, highlight.js
- Search: Fuse.js
- Deployed on Vercel

---

## Running Locally

```bash
cd banterblogs-nextjs
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

To enable the research hub, copy `env.example` to `.env.local` and set `REPORTS_ENABLED=true`.

---

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-change`).
3. Commit your changes.
4. Open a pull request.

---

## License

MIT. See [LICENSE](LICENSE) for details.
