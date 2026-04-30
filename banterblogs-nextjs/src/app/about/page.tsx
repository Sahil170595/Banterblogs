import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';

export const metadata: Metadata = {
  title: 'About Chimera',
  description:
    'Constitutional AI ecosystem built by Sahil Kadadekar — 9 repos across Python, Rust, TypeScript, and C#. Constitutional enforcement, cryptographic provenance, and self-improving alignment.',
};

export default async function AboutPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  return (
    <div className="container py-16">
      {/* ── Hero ── */}
      <div className="signal-panel-strong mb-16 p-8 md:p-12">
        <div className="space-y-5 w-full">
          <span className="signal-pill">About</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Constitutional AI that proves its reasoning.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Chimera is a constitutional AI enforcement architecture. Every action routes through
            an embedding-based safety classifier, escalates to multi-model debate when uncertain,
            and produces cryptographically signed provenance chains with zero-knowledge proofs.
            The system self-improves: debate outcomes train the alignment encoder through an RLAIF loop.
          </p>
          <p className="text-sm text-muted-foreground/80">
            Built by <span className="text-foreground font-medium">Sahil Kadadekar</span> &middot;
            Solo architect &middot; Sep 2025 &ndash; Present
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
            <h3 className="font-semibold mb-3">The architecture</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A constitutional AI enforcement system spanning Python and Rust. The fast-path router
              classifies 99% of queries in &lt;10ms via embedding cosine similarity. Uncertain queries
              escalate to a multi-model debate engine with heat-based escalation and three consensus
              algorithms. The Rust runtime (7 crates) provides Ed25519 provenance chains, BFT consensus,
              and zero-knowledge proofs for cross-trust-boundary communication. JARVIS is the agent layer —
              multi-provider chat, voice (Whisper/Piper), semantic memory, tool execution with
              human-in-the-loop approval, and proactive intelligence.
            </p>
          </div>
          <div className="signal-panel p-6">
            <h3 className="font-semibold mb-3">The research</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              728,000+ measurements across 44 technical reports. Not wall-clock approximations —
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
              lang: 'Python, Rust',
              what: 'Core monorepo — 6 subsystems: JARVIS (AI gateway), TDD002 (constitutional router), Chimera (debate engine), TDD005 (Rust runtime with ZK proofs + BFT), RLAIF (self-improving alignment), and Authoring (LLM providers).',
            },
            {
              name: 'Banterhearts',
              lang: 'Python',
              what: 'ML research platform — inference API, benchmarking infrastructure, AutoOpt agent, safety evaluation framework. Source of 728K+ measurements across 44 technical reports.',
            },
            {
              name: 'Chimeraforge',
              lang: 'Python, Rust',
              what: 'LLM deployment optimizer on PyPI. 4-gate capacity planner (VRAM, Quality, Latency, Cost) across 15 GPU profiles.',
            },
            {
              name: 'Chimera Multi-Agent',
              lang: 'Python',
              what: 'Muse Protocol — 6-agent content pipeline with ClickHouse analytics. Also the observability control plane (OTel, Datadog, DLQ).',
            },
            {
              name: 'Chimeradroid',
              lang: 'C# / Unity',
              what: 'Android companion for JARVIS — voice, chat, session handoff, tool approval, mesh networking, offline-first.',
            },
            {
              name: 'Echo',
              lang: 'Python',
              what: 'Messaging channel adapters — Slack and Discord bridges to JARVIS. Session tracking, device key auth.',
            },
            {
              name: 'JARVIS Console',
              lang: 'TypeScript / Next.js',
              what: 'Web console for JARVIS — chat with streaming, control room dashboard, cognitive agent ELO, tool catalog, workflow management.',
            },
            {
              name: 'This Site',
              lang: 'TypeScript / Next.js',
              what: 'Public presence. Episodes generated from git commits, research archive, platform documentation.',
            },
          ].map((repo) => (
            <div key={repo.name} className="signal-panel p-5 flex flex-col md:flex-row md:items-start gap-4">
              <div className="md:w-48 shrink-0">
                <h3 className="font-semibold text-foreground">{repo.name}</h3>
                <div className="text-xs text-muted-foreground">
                  {repo.lang}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{repo.what}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground/70">
          9 repositories &middot; Python, Rust, TypeScript, C# &middot; 89 patches shipped
        </div>
      </section>

      {/* ── Numbers ── */}
      <section className="mb-20">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { value: '728K+', label: 'Research Measurements' },
            { value: '44', label: 'Technical Reports' },
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

        <div className="signal-panel p-6 w-full">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Episodes are auto-generated from git commits across all eight repositories. A multi-agent
            pipeline (Chimera Multi-Agent) ingests commits and benchmark data, generates roundtable-style
            commentary with four AI personas, and publishes to this Next.js site via GitHub + Vercel.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The research archive surfaces 44 technical reports with phase grouping, searchable titles,
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
          <Link
            href="https://substack.com/@sahilkadadekar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
          >
            Substack
          </Link>
        </div>
      </section>
    </div>
  );
}
