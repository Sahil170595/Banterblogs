import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Cpu,
  GitFork,
  Layers,
  Radio,
  Smartphone,
  Workflow,
} from 'lucide-react';
import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { formatNumber } from '@/lib/formatUtils';

export const metadata: Metadata = {
  title: 'Ecosystem Architecture',
  description:
    'Six repositories, 200K+ lines of code — real-time streaming AI, ML research with 70K+ measurements, multi-agent orchestration, and mobile deployment.',
};

export default async function AboutPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  const repos = [
    {
      name: 'Banterpacks',
      role: 'Production Monorepo',
      icon: <Radio className="h-5 w-5" />,
      tone: 'from-primary to-accent',
      loc: '122K',
      lang: 'TypeScript / Rust',
      details: [
        'Real-time streaming overlay with sub-200ms latency',
        'Manifest registry with shard hashing and rollout controls',
        'JARVIS AI gateway with constitutional governance (TDD001/TDD002)',
        'Rust runtime (TDD005) delivering 58% latency reduction',
        '305+ automated tests across unit, integration, and E2E',
      ],
      href: '/platform',
    },
    {
      name: 'Banterhearts',
      role: 'ML Research Platform',
      icon: <Cpu className="h-5 w-5" />,
      tone: 'from-accent to-primary',
      loc: '32K',
      lang: 'Python',
      details: [
        '70,000+ real benchmark measurements with CUDA event timing',
        '26 technical reports across model loading, quantization, and serving',
        'Capacity planning CLI and FastAPI production services',
        'INT8/FP8 quantization pipelines and TensorRT compilation',
        'Multi-service architecture with GPU telemetry and alerting',
      ],
      href: '/reports',
    },
    {
      name: 'Chimeraforge',
      role: 'Research Breakout',
      icon: <BarChart3 className="h-5 w-5" />,
      tone: 'from-emerald-500 to-teal-600',
      loc: '13K',
      lang: 'Python',
      details: [
        '4.3 GB of experiment data and model outputs',
        'chimeraforge plan CLI with 4-gate capacity planner',
        'Benchmarking infrastructure for inference optimization',
        'KV cache analysis, context scaling, and concurrency profiling',
      ],
      href: '/reports',
    },
    {
      name: 'Chimera Multi-Agent',
      role: '6-Agent Pipeline',
      icon: <BrainCircuit className="h-5 w-5" />,
      tone: 'from-orange-500 to-amber-600',
      loc: '18K',
      lang: 'Python',
      details: [
        '6 specialized agents: ingestor, collector, watcher, council, publisher, translator',
        'ClickHouse for time-series analytics and Datadog for observability',
        'MCP servers for tool orchestration',
        'Production multi-agent coordination, not a demo',
      ],
      href: '/chimera',
    },
    {
      name: 'Chimeradroid',
      role: 'Mobile Client',
      icon: <Smartphone className="h-5 w-5" />,
      tone: 'from-violet-500 to-purple-600',
      loc: '3K',
      lang: 'C# / Unity',
      details: [
        'Android client for the JARVIS v2 gateway',
        'Unity-based interface for mobile AI interaction',
        'Real device deployment, not a simulator mock',
      ],
    },
    {
      name: 'Chimeraforge',
      role: 'This Site',
      icon: <Layers className="h-5 w-5" />,
      tone: 'from-primary to-primary/60',
      loc: '8K',
      lang: 'TypeScript / Next.js',
      details: [
        'Automated episode generation from git commits across all repos',
        'Research archive surfacing 26 technical reports with phase grouping',
        'Multi-persona roundtable narration (Claude, GPT, Gemini, Banterpacks)',
        'SSG with ISR, search, tags, and structured data',
      ],
      href: '/episodes',
    },
  ];

  return (
    <div className="container py-16">
      {/* Hero */}
      <div className="signal-panel-strong mb-16 p-8 md:p-12">
        <div className="space-y-5 text-center">
          <span className="signal-pill">Ecosystem Architecture</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Six Repos. One Mission.
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Chimeraforge is the public face of a 200K+ line-of-code ecosystem spanning real-time
            streaming AI, production ML research, multi-agent orchestration, and mobile deployment.
            Everything documented here is backed by real infrastructure.
          </p>
        </div>
      </div>

      {/* Scale Metrics */}
      <section className="mb-16">
        <h2 id="metrics" className="text-sm font-semibold mb-6 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
          By the Numbers
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { value: '200K+', label: 'Lines of Code', sub: 'Across 6 repositories' },
            { value: '70K+', label: 'Measurements', sub: 'CUDA event timing' },
            { value: '26', label: 'Technical Reports', sub: 'Model to deployment' },
            { value: '305+', label: 'Automated Tests', sub: 'Unit, integration, E2E' },
            { value: '6', label: 'AI Agents', sub: 'Production pipeline' },
            { value: String(stats.totalEpisodes), label: 'Episodes', sub: 'Auto-generated' },
          ].map((item) => (
            <div
              key={item.label}
              className="signal-panel p-5 text-center"
            >
              <div className="text-2xl md:text-3xl font-bold text-primary">{item.value}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{item.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture Flow */}
      <section className="mb-16">
        <h2 id="architecture" className="text-sm font-semibold mb-6 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
          How It Connects
        </h2>
        <div className="signal-panel p-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '1',
                title: 'Live Gameplay',
                desc: 'Banterpacks overlay processes game events in real-time via the JARVIS gateway, routing across 4 LLM providers with sub-200ms latency.',
              },
              {
                step: '2',
                title: 'Research & Optimize',
                desc: 'Banterhearts runs 70K+ benchmark measurements. Chimeraforge breaks out the capacity planner. Results feed back into model selection and quantization.',
              },
              {
                step: '3',
                title: 'Orchestrate',
                desc: 'Chimera Multi-Agent deploys 6 specialized agents with ClickHouse analytics and Datadog monitoring. Chimeradroid extends the gateway to mobile.',
              },
              {
                step: '4',
                title: 'Document',
                desc: 'Chimeraforge ingests commits from all repos, generates episodes with multi-persona narration, and publishes the research archive you see here.',
              },
            ].map((item) => (
              <div key={item.step} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {item.step}
                  </span>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Repository Cards */}
      <section className="mb-16">
        <h2 id="repos" className="text-sm font-semibold mb-6 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
          Repository Breakdown
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <div
              key={repo.name}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 p-6 transition-all hover:border-border hover:bg-muted/20"
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${repo.tone} opacity-60 group-hover:opacity-100 transition-opacity`} />
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {repo.icon}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{repo.name}</h3>
                  <p className="text-xs text-muted-foreground">{repo.role}</p>
                </div>
              </div>
              <div className="flex gap-3 mb-4">
                <span className="inline-flex items-center rounded-full border border-border/50 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {repo.loc} LOC
                </span>
                <span className="inline-flex items-center rounded-full border border-border/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                  {repo.lang}
                </span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {repo.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              {repo.href && (
                <Link
                  href={repo.href}
                  aria-label={`Explore ${repo.name}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Explore
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="mb-16">
        <h2 id="differentiators" className="text-sm font-semibold mb-6 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
          What Makes This Different
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="signal-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <GitFork className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-foreground">Constitutional AI Governance</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              TDD001 and TDD002 are governance documents for the JARVIS gateway — not aspirational
              policy, but enforced constraints on how the AI system operates. Rate limiting, content
              filtering, and safety boundaries are baked into the runtime.
            </p>
          </div>
          <div className="signal-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Workflow className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-foreground">Hybrid Rust + Python Runtime</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              TDD005 documents the Rust runtime integration that delivered a 58% latency reduction.
              This isn&apos;t a rewrite-everything bet — it&apos;s a surgical hybrid where Rust handles the hot
              path and Python keeps the flexibility. The &quot;Dual Ollama&quot; pattern runs both simultaneously.
            </p>
          </div>
          <div className="signal-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Bot className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-foreground">Real Measurements, Not Claims</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The 70,000+ measurements in Banterhearts use CUDA event timing, not wall-clock
              approximations. Every claim in the technical reports traces back to reproducible
              benchmarks with defined hardware profiles and statistical methodology.
            </p>
          </div>
        </div>
      </section>

      {/* Episode Stats + CTAs */}
      <section>
        <div className="signal-panel p-8">
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Start Exploring</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg">
                {stats.totalEpisodes} episodes documenting {formatNumber(stats.totalLinesAdded)} lines
                of development across the full ecosystem. 26 technical reports backed by 70,000+
                measurements.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Research Archive
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/episodes"
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
              >
                Episodes
              </Link>
              <Link
                href="/platform"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
              >
                Platform Deep Dive
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
