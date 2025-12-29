import Link from 'next/link';
import { ArrowRight, BookOpen, Cpu, Gauge, Radio, Workflow } from 'lucide-react';
import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { formatNumber, formatReadingTime } from '@/lib/formatUtils';

export default async function PlatformPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-16 p-8 md:p-12">
        <div className="space-y-5 text-center">
          <span className="signal-pill">Chimera Platform</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">The Banter Platform</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Three tightly-linked systems working as a loop: <strong>Banterpacks</strong> delivers real-time banter on stream,
            <strong> Banterhearts</strong> (Chimera Heart) learns from every reaction, and <strong>Banterblogs</strong> automates the running commentary so no decision is a black box.
          </p>
        </div>
      </div>

      <section id="overview" className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Platform Overview</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <article id="banterpacks" className="signal-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Radio className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-semibold">Banterpacks Overlay</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Browser-source overlay that reacts to gameplay events in under 200ms with multi-LLM routing, speech interfaces, and OBS-ready rendering.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Latency budget: under 200ms from event to render</li>
              <li>Provider pool: GPT-4, Claude, Gemini, local Ollama</li>
              <li>Speech stack: STT, emotion detection, optional TTS</li>
              <li>Manifest registry with shard hashing and rollout controls</li>
            </ul>
          </article>

          <article id="banterhearts" className="signal-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Cpu className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-semibold">Banterhearts (Chimera Heart)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Production ML backbone that ingests viewer feedback, runs RLHF pipelines, and deploys quantized models with a sub-100ms inference SLO.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Feedback ingestion with anonymization and schema validation</li>
              <li>Daily RLHF and evaluation loop with promotion gates</li>
              <li>Model registry for rollout, shadow traffic, and rollback</li>
              <li>GPU-optimized kernels, quantization, and live monitoring</li>
            </ul>
          </article>

          <article id="banterblogs" className="signal-panel p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <BookOpen className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-semibold">Banterblogs Automation</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Narrative engine that turns commits, CI artifacts, and telemetry into the four-person roundtable episodes published here.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Parses git history, PRDs, and registry manifests</li>
              <li>Pulls performance and observability metrics from Chimera Heart</li>
              <li>Maps changes to Claude, ChatGPT, Gemini, and Banterpacks personas</li>
              <li>Publishes searchable episodes with stats and change tracking</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="loop" className="mb-16">
        <div className="signal-panel p-8">
          <h2 className="text-3xl font-bold mb-6 text-center">Closed-Loop Feedback</h2>
          <div className="grid gap-6 md:grid-cols-4 text-sm text-muted-foreground">
            {[
              {
                title: '1. Live Gameplay',
                text: 'Telemetry and viewer sentiment trigger Banterpacks overlay events.'
              },
              {
                title: '2. Banterhearts Ingest',
                text: 'Signals land in Chimera Heart for anonymization, validation, and RLHF training.'
              },
              {
                title: '3. Model Deployment',
                text: 'Quantized models roll out via the registry API, powering fresh overlay responses.'
              },
              {
                title: '4. Storytelling',
                text: 'Banterblogs ingests commits and metrics to explain what changed and why.'
              }
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-border/60 bg-background/40 p-4">
                <h4 className="font-semibold mb-2 text-foreground">{step.title}</h4>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="metrics" className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Key Metrics Snapshot</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { value: '<200ms', label: 'Banterpacks render budget (event to on-screen banter)' },
            { value: '<100ms', label: 'Banterhearts inference SLO for tuned banter suggestions' },
            { value: '24h', label: 'Commit to retrain to redeploy cycle for new pack intelligence' },
            { value: '4+', label: 'LLM providers managed simultaneously with health fallbacks' },
            { value: '90%+', label: 'Target satisfaction score from Banterhearts feedback loop' },
            { value: formatNumber(stats.totalLinesAdded), label: 'Lines of code captured in Banterblogs episodes' },
          ].map((item) => (
            <div key={item.label} className="signal-panel p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">{item.value}</div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="deep-dive" className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Subsystem Deep Dive</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="signal-panel p-6">
            <h3 className="text-lg font-semibold mb-3">Banterpacks Overlay</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Event bus orchestrator with cooldown and dedupe windows</li>
              <li>Service worker and IndexedDB caching for offline resilience</li>
              <li>Health panel exposing LLM, TTS, and STT adapter status</li>
              <li>Prometheus metrics and Grafana dashboards via registry</li>
            </ul>
            <Link href="/technology#overlay" className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:text-primary/80">
              Explore Banterpacks details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="signal-panel p-6">
            <h3 className="text-lg font-semibold mb-3">Banterhearts / Chimera Heart</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Multi-service FastAPI workers with GPU telemetry and alerting</li>
              <li>Quantization benchmarks (INT8 / FP8) and custom kernels</li>
              <li>Data governance: anonymization, encryption, audit logging</li>
              <li>CI coverage across unit, integration, performance, and ops tests</li>
            </ul>
            <Link href="/technology#chimera-heart" className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:text-primary/80">
              See Banterhearts internals
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="signal-panel p-6">
            <h3 className="text-lg font-semibold mb-3">Banterblogs Automation</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Episode generator consumes commits, PRDs, and patch notes</li>
              <li>Character templates keep roundtable voices consistent</li>
              <li>Stats pipeline tracks files changed, lines added, and reading time</li>
              <li>Onboarding and search surfaces help readers follow the saga</li>
            </ul>
            <Link href="/about#automation-loop" className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:text-primary/80">
              Learn how episodes are produced
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="stats" className="mb-16">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { value: stats.totalEpisodes, label: 'Episodes Generated' },
            { value: formatNumber(stats.totalFilesChanged), label: 'Files Touched' },
            { value: formatNumber(stats.totalLinesAdded), label: 'Lines Added' },
            { value: formatReadingTime(stats.totalReadingTime), label: 'Total Reading Time' },
          ].map((item) => (
            <div key={item.label} className="signal-panel p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">{item.value}</div>
              <div className="text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="next-steps" className="mb-16">
        <div className="signal-panel p-6">
          <h2 className="text-2xl font-semibold mb-4 text-center">Start Exploring</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Workflow className="h-4 w-4" />
                <h3 className="font-semibold">About the Project</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Learn how the platform came together, the characters, and the storytelling engine that ships every episode.
              </p>
              <Link href="/about" className="text-sm font-medium text-primary hover:text-primary/80">
                Read the About page
              </Link>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Gauge className="h-4 w-4" />
                <h3 className="font-semibold">Technology Deep Dives</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Breakdowns of the overlay architecture, Chimera Heart infrastructure, and automation tooling - no private repos required.
              </p>
              <Link href="/technology" className="text-sm font-medium text-primary hover:text-primary/80">
                Visit the Technology page
              </Link>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <BookOpen className="h-4 w-4" />
                <h3 className="font-semibold">Episodes and Timeline</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Follow the chronological story of commits, decisions, and telemetry that shaped the Banter Platform.
              </p>
              <Link href="/episodes" className="text-sm font-medium text-primary hover:text-primary/80">
                Browse episodes
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
