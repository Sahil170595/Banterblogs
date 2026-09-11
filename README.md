<div align="center">

# Chimeraforge

**Development log and research archive for the Chimera ecosystem.**

[![Live Site](https://img.shields.io/badge/Live-chimeraforge.vercel.app-black?style=for-the-badge)](https://chimeraforge.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Visit the site](https://chimeraforge.vercel.app) · [Browse episodes](https://chimeraforge.vercel.app/episodes) · [Read reports](https://chimeraforge.vercel.app/reports)

</div>

---

## What is Chimeraforge

Chimeraforge is the public-facing site for the Chimera ecosystem — a constitutional AI enforcement architecture spanning 9 repositories across Python, Rust, TypeScript, C#, and JavaScript. The site publishes three things:

- **Episodes** — narrative write-ups generated from git commits across the ecosystem. Each episode is written as a roundtable discussion between four AI personas, turning raw development activity into readable stories.
- **Research reports** — technical benchmarks covering LLM performance, quantization, inference optimization, and safety alignment. Current counts: https://chimeraforge.vercel.app/reports.json
- **Papers** — independent research write-ups. One paper accepted at the ICML 2026 Workshop on Hypothesis Testing, one public arXiv preprint, more under blind review and in preparation. Current roster: https://chimeraforge.vercel.app/papers

The site is live at [chimeraforge.vercel.app](https://chimeraforge.vercel.app). It carries an archived episode log (268 entries, retired 2026-06-26) — the final episode in each line is a full retrospective, and ongoing work is documented through the research reports.

---

## The Chimera Ecosystem

Chimeraforge documents work across nine repositories:

| Repository | Purpose |
|---|---|
| **Banterpacks** | Core monorepo — JARVIS gateway, constitutional router (TDD002), debate engine (Chimera), Rust runtime (TDD005) with ZK proofs + BFT, RLAIF alignment loop, authoring. |
| **Banterhearts** | ML research platform — inference API, benchmarking, AutoOpt agent, safety evaluation. Current counts: https://chimeraforge.vercel.app/reports.json |
| **Chimeraforge (PyPI)** | LLM deployment optimizer on PyPI (v0.30.10). Model-agnostic 5-gate capacity planner (VRAM, quality, safety opt-in, latency, cost) — plans any registry / Ollama / HuggingFace model across 22 GPU profiles, and serves the same numbers to AI assistants over MCP. Every number labeled `measured` / `estimated` / `unknown`. |
| **Chimera Multi-Agent** | Muse Protocol — 6-agent content pipeline + observability control plane (OTel, ClickHouse, Datadog). |
| **Chimeradroid** | Unity/C# Android companion — voice, chat, tool approval, session handoff, mesh networking. |
| **Echo** | Messaging channel adapters — Slack and Discord bridges to JARVIS. |
| **JARVIS Console** | Next.js web console — chat, control room, cognitive ELO dashboard, admin panels. |
| **Project Wyvern** | Embodied autonomy — governed mission-execution plane between Chimera control and PX4/ArduPilot. SIM-ONLY MVP on PX4 + ROS 2 + Gazebo. |
| **Banterblogs** | This repository. Development log and research archive. |

### Standalone tools

Not part of the nine — independent CLIs that productize the research line:

| Tool | Purpose |
|---|---|
| **quantfit** (PyPI) | Quantize an LLM and check it still refuses what it should (v0.12.16, Apache-2.0). AWQ / GPTQ / SmoothQuant / FP8 / RTN + GGUF, honest 3-tier capacity refusal, and a two-axis safety-drift check (refusal-robustness + over-refusal) against an unquantized baseline. |

Both shipped CLIs have pages at [/tools](https://chimeraforge.vercel.app/tools).

---

## Repository Structure

```
Banterblogs/
  banterblogs-nextjs/     # The active Next.js application
    src/                  # App source (pages, components, lib)
    posts/                # archived episode log (268 entries, retired 2026-06-26)
    reports/              # Technical report data (benchmarks, analysis)
    PublishReady/         # Processed reports ready for rendering
  legacy_archive/         # Original static site (archived, read-only)
```

---

## Tech Stack

- **Next.js 16** (App Router) with React 19 Server Components and Static Site Generation
- **TypeScript** in strict mode
- **Tailwind CSS 3.4** with a custom dark theme ("Obsidian & Ember" — single hot-copper accent)
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
