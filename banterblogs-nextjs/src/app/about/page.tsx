import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';

export const metadata: Metadata = {
  title: 'About Chimeraforge',
  description:
    'Personal AI platform built by Sahil Kadadekar — 6 repos, 200K+ LOC, 555K+ research measurements, running on your hardware.',
};

export default async function AboutPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  return (
    <div className="container py-16">
      {/* ── Hero ── */}
      <div className="signal-panel-strong mb-16 p-8 md:p-12">
        <div className="space-y-5 max-w-3xl">
          <span className="signal-pill">About</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Building a personal AI that actually works.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Chimeraforge is a personal AI platform — think JARVIS, not chatbot. It runs on your
            hardware, handles your calendar, inbox, smart home, memory, and proactive tasks, and
            does it all with local inference and constitutional AI governance. No cloud dependency.
          </p>
          <p className="text-sm text-muted-foreground/80">
            Built by <span className="text-foreground font-medium">Sahil Kadadekar</span> &middot;
            In active beta with select testers on Windows and Apple devices
          </p>
        </div>
      </div>

      {/* ── What This Is ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          What This Is
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="signal-panel p-6">
            <h3 className="font-semibold mb-3">The product</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A multi-modal smart assistant with 7 modules — calendar, inbox, memory, smart home,
              proactive intelligence, tools, and a plugin store. Runs entirely on local hardware
              with multi-LLM routing (GPT-4, Claude, Gemini, local Ollama). The Rust runtime
              delivers 58% latency reduction over pure Python. The &quot;Dual Ollama&quot; pattern
              achieves near-zero contention under concurrent agent load.
            </p>
          </div>
          <div className="signal-panel p-6">
            <h3 className="font-semibold mb-3">The research</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              555,000+ measurements across 36 technical reports. Not wall-clock approximations —
              CUDA event timing with defined hardware profiles and statistical methodology. Covers
              model loading, ONNX conversion, TensorRT compilation, KV cache optimization,
              multi-agent coordination, and safety analysis across Ollama, vLLM, and TGI.
            </p>
          </div>
        </div>
      </section>

      {/* ── The Ecosystem ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-accent" />
          The Ecosystem
        </h2>

        <div className="space-y-3">
          {[
            {
              name: 'Banterpacks',
              loc: '122K LOC',
              lang: 'TypeScript, Rust, Python',
              what: 'Production monorepo — 9 Python services, 4 Node.js apps, 10 Rust crates. Hosts the JARVIS gateway, intelligence pipeline, and constitutional AI.',
            },
            {
              name: 'Banterhearts',
              loc: '32K LOC',
              lang: 'Python',
              what: 'ML research platform — inference API, benchmarking infrastructure, AutoOpt agent, safety evaluation framework. Source of 555K+ measurements.',
            },
            {
              name: 'Chimeraforge Tools',
              loc: '39K LOC',
              lang: 'Python, Rust',
              what: 'Capacity planner and bench runner. 4-gate selection (VRAM, Quality, Latency, Cost) across 15 GPU profiles.',
            },
            {
              name: 'Chimera Multi-Agent',
              loc: '12K LOC',
              lang: 'Python',
              what: '6-agent content pipeline. Ingests bench data + git commits, generates episodes, publishes to GitHub/Vercel, translates to 3 languages.',
            },
            {
              name: 'Chimeradroid',
              loc: '3.5K LOC',
              lang: 'C# / Unity',
              what: 'Android client for the JARVIS gateway — 8-tab GUI, voice, session handoff, mesh networking.',
            },
            {
              name: 'This Site',
              loc: '8K LOC',
              lang: 'TypeScript / Next.js',
              what: 'Public presence. Episodes, research archive, and platform documentation. SSG with ISR.',
            },
          ].map((repo) => (
            <div key={repo.name} className="signal-panel p-5 flex flex-col md:flex-row md:items-start gap-4">
              <div className="md:w-48 shrink-0">
                <h3 className="font-semibold text-foreground">{repo.name}</h3>
                <div className="text-xs text-muted-foreground">
                  {repo.loc} &middot; {repo.lang}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{repo.what}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground/70">
          6 repositories &middot; 200K+ lines of code &middot; Python, TypeScript, Rust, C#
        </div>
      </section>

      {/* ── Numbers ── */}
      <section className="mb-20">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { value: '555K+', label: 'Research Measurements' },
            { value: '36', label: 'Technical Reports' },
            { value: String(stats.totalEpisodes), label: 'Episodes Shipped' },
            { value: formatNumber(stats.totalLinesAdded), label: 'Lines Documented' },
          ].map((stat) => (
            <div key={stat.label} className="signal-panel p-5 text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── This Site ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          About This Site
        </h2>

        <div className="signal-panel p-6 max-w-2xl">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Episodes are auto-generated from git commits across all six repositories. A multi-agent
            pipeline (Chimera Multi-Agent) ingests commits and benchmark data, generates roundtable-style
            commentary with four AI personas, and publishes to this Next.js site via GitHub + Vercel.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The research archive surfaces 36 technical reports with phase grouping, searchable titles,
            and ISR with 15-minute revalidation. Every report links to real measurements and defined
            methodology.
          </p>
        </div>
      </section>

      {/* ── CTAs ── */}
      <section>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Platform Architecture
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
          >
            Research Archive
          </Link>
          <Link
            href="/episodes"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
          >
            Episodes
          </Link>
        </div>
      </section>
    </div>
  );
}
