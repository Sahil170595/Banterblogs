import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  Calendar,
  Cpu,
  Gauge,
  Home,
  Inbox,
  Layers,
  Mail,
  Shield,
  Smartphone,
  Wrench,
} from 'lucide-react';
import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { formatReadingTime } from '@/lib/formatUtils';

export default async function PlatformPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  return (
    <div className="container py-16">
      {/* ── Hero ── */}
      <div className="signal-panel-strong mb-16 p-8 md:p-12">
        <div className="space-y-5 max-w-3xl">
          <span className="signal-pill">Platform Architecture</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            What Powers Chimeraforge
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Six repositories, 30+ services, four languages. Two core engines —{' '}
            <strong>Banterpacks</strong> (real-time AI orchestration) and{' '}
            <strong>Banterhearts</strong> (ML research & inference) — power everything
            from the JARVIS gateway to mobile clients to capacity planning tools.
          </p>
        </div>
      </div>

      {/* ── Core Engines ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Core Engines
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Banterpacks */}
          <div className="signal-panel p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Layers className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-semibold">Banterpacks</h3>
                <span className="text-xs text-muted-foreground">122K LOC — TypeScript, Rust, Python</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              The production monorepo. 9 Python services, 4 Node.js apps, and 10 Rust crates
              handling real-time AI orchestration, constitutional governance, and the JARVIS
              multi-modal assistant.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { icon: Brain, label: 'JARVIS Gateway', detail: '7 modules — calendar, inbox, memory, smart home, proactive, tools, store' },
                { icon: Shield, label: 'Constitutional AI', detail: 'Multi-model consensus debate platform with TDD validation' },
                { icon: Cpu, label: 'Intelligence Pipeline', detail: 'Local-first orchestrator with provider selection and guardrails' },
                { icon: Wrench, label: 'Rust Core', detail: '10 crates — FFI, P2P sync, checkpoints, provenance, sandbox' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/40 bg-card/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground/70">
              829+ test files &middot; 5 OpenAPI contracts &middot; 14 Docker profiles
            </div>
          </div>

          {/* Banterhearts */}
          <div className="signal-panel p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Gauge className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-semibold">Banterhearts</h3>
                <span className="text-xs text-muted-foreground">32K LOC — Python</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              ML research platform and production inference backbone. 126,000+ CUDA-timed measurements
              across 30 technical reports, targeting RTX 4080 Laptop (12GB VRAM) with sub-100ms inference.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { icon: Cpu, label: 'Inference API', detail: 'Model selection, streaming, multi-backend dispatch' },
                { icon: Shield, label: 'Safety Research', detail: 'Alignment under quantization, concurrency, cross-backend consistency' },
                { icon: Gauge, label: 'Benchmarking', detail: '4 compilation backends, 5 quantization formats, GPU kernel profiling' },
                { icon: Brain, label: 'AutoOpt Agent', detail: 'Thompson sampling, multi-armed bandit, SLA enforcement' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/40 bg-card/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className="h-3.5 w-3.5 text-accent" />
                    <span className="text-xs font-semibold text-foreground">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground/70">
              37-file evaluation framework &middot; 20 monitoring modules &middot; 12 security modules
            </div>
          </div>
        </div>
      </section>

      {/* ── JARVIS Gateway ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-accent" />
          JARVIS Gateway
        </h2>

        <div className="signal-panel p-6 md:p-8">
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl leading-relaxed">
            Multi-modal smart assistant that runs locally on your hardware. Seven modules work together
            to handle daily tasks, control smart home devices, manage your calendar and inbox, and learn
            your patterns over time.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { icon: Calendar, label: 'Calendar' },
              { icon: Inbox, label: 'Inbox' },
              { icon: Brain, label: 'Memory' },
              { icon: Home, label: 'Smart Home' },
              { icon: Gauge, label: 'Proactive' },
              { icon: Wrench, label: 'Tools' },
              { icon: Layers, label: 'Store' },
            ].map((mod) => (
              <div key={mod.label} className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card/30 p-4">
                <mod.icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold">{mod.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Supporting Systems ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Supporting Systems
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="signal-panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Chimera Multi-Agent</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              6-agent content pipeline (Muse Protocol). Ingests bench data and git commits,
              generates episodes, publishes to GitHub/Vercel, translates to 3 languages.
            </p>
            <span className="text-[10px] text-muted-foreground/70">12K LOC &middot; 8 MCP servers &middot; ClickHouse</span>
          </div>

          <div className="signal-panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Chimeraforge Tools</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              LLM deployment optimizer on PyPI. 4-gate capacity planner (VRAM, Quality, Latency, Cost)
              across model x quant x backend x agents, 15-GPU database.
            </p>
            <span className="text-[10px] text-muted-foreground/70">39K LOC &middot; Python + Rust &middot; 158 tests</span>
            <Link
              href="https://pypi.org/project/chimeraforge/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              pip install chimeraforge
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="signal-panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Chimeradroid</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Android client for the JARVIS gateway. 8-tab GUI with voice, chat, session handoff,
              tool approval, mesh networking, and proactive notifications.
            </p>
            <span className="text-[10px] text-muted-foreground/70">3.5K LOC &middot; C#/Unity &middot; WebSocket streaming</span>
          </div>

          <div className="signal-panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">This Site</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Public presence and research archive. Next.js 15 with SSG + ISR, 266+ episodes,
              30+ technical reports, and full-text search.
            </p>
            <span className="text-[10px] text-muted-foreground/70">8K LOC &middot; TypeScript &middot; Vercel</span>
          </div>
        </div>
      </section>

      {/* ── Key Numbers ── */}
      <section className="mb-20">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { value: '200K+', label: 'Lines of Code' },
            { value: '126K+', label: 'Research Measurements' },
            { value: String(stats.totalEpisodes), label: 'Episodes Shipped' },
            { value: formatReadingTime(stats.totalReadingTime), label: 'Total Reading Time' },
            { value: '30+', label: 'Services' },
            { value: '4', label: 'Languages' },
            { value: '829+', label: 'Test Files' },
            { value: '<100ms', label: 'Inference Target' },
          ].map((item) => (
            <div key={item.label} className="signal-panel p-5 text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">{item.value}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Data Flow ── */}
      <section className="mb-20">
        <h2 className="text-sm font-semibold mb-8 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          How Data Flows
        </h2>

        <div className="signal-panel p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-4 text-sm text-muted-foreground">
            {[
              {
                step: '1',
                title: 'Ingest',
                text: 'Banterhearts bench data and Banterpacks git commits flow into ClickHouse via dedicated agents.',
              },
              {
                step: '2',
                title: 'Process',
                text: 'Watcher monitors pipeline health. Council generates episodes with performance insights baked in.',
              },
              {
                step: '3',
                title: 'Publish',
                text: 'Publisher pushes episodes to GitHub. Vercel rebuilds the site. i18n translates to German, Chinese, Hindi.',
              },
              {
                step: '4',
                title: 'Serve',
                text: 'JARVIS gateway dispatches inference locally. Chimeradroid extends access to mobile devices.',
              },
            ].map((step) => (
              <div key={step.step} className="rounded-xl border border-border/40 bg-card/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {step.step}
                  </span>
                  <h4 className="font-semibold text-foreground">{step.title}</h4>
                </div>
                <p className="text-xs leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Explore ── */}
      <section>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/reports"
            className="block group signal-panel p-5 hover:border-primary/40 transition-all"
          >
            <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Research Archive</h3>
            <p className="text-sm text-muted-foreground mb-3">
              30+ technical reports with 126,000+ measurements across inference, optimization, and safety.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              Browse reports <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
          <Link
            href="/episodes"
            className="block group signal-panel p-5 hover:border-primary/40 transition-all"
          >
            <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">Episode Archive</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {stats.totalEpisodes}+ episodes documenting every commit, decision, and telemetry data point.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              Browse episodes <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
          <Link
            href="/about"
            className="block group signal-panel p-5 hover:border-primary/40 transition-all"
          >
            <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">About the Project</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Who built this, why, and where it&apos;s headed.
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              Read more <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
