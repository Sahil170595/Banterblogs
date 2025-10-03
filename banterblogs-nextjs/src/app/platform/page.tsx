import Link from 'next/link';
import { getAllEpisodes, getEpisodeStats } from '@/lib/episodes';
import { formatNumber, formatReadingTime } from '@/lib/formatUtils';

export default async function PlatformPage() {
  const episodes = await getAllEpisodes();
  const stats = getEpisodeStats(episodes);

  return (
    <div className="container py-16">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">The Banter Platform</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Three tightly-linked systems working as a loop: <strong>Banterpacks</strong> delivers real-time banter on stream,
            <strong> Banterhearts</strong> (Chimera Heart) learns from every reaction, and <strong>Banterblogs</strong> automates the running commentary so no decision is a black box.
          </p>
        </header>

        <section id="overview" className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Platform Overview</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <article id="banterpacks" className="p-6 rounded-xl border border-border bg-card/60 backdrop-blur">
              <h3 className="text-xl font-semibold mb-3">Banterpacks Overlay</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Browser-source overlay that reacts to gameplay events in under 200ms with multi-LLM routing, speech interfaces, and OBS-ready rendering.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Latency budget: &lt;200ms end-to-end event → render</li>
                <li>Provider pool: GPT-4, Claude, Gemini, local Ollama</li>
                <li>Speech stack: STT + emotion detection + optional TTS</li>
                <li>Manifest registry with shard hashing + rollout controls</li>
              </ul>
            </article>

            <article id="banterhearts" className="p-6 rounded-xl border border-border bg-card/60 backdrop-blur">
              <h3 className="text-xl font-semibold mb-3">Banterhearts (Chimera Heart)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Production ML backbone that ingests viewer feedback, runs RLHF pipelines, and deploys quantized models with a &lt;100ms inference SLO.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Feedback ingestion with anonymization + schema validation</li>
                <li>Daily RLHF + evaluation loop with guarded promotion gates</li>
                <li>Model registry for rollout, shadow traffic, and rollback</li>
                <li>GPU-optimized kernels, quantization, and live monitoring</li>
              </ul>
            </article>

            <article id="banterblogs" className="p-6 rounded-xl border border-border bg-card/60 backdrop-blur">
              <h3 className="text-xl font-semibold mb-3">Banterblogs Automation</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Narrative engine that turns commits, CI artifacts, and telemetry into the four-person roundtable episodes published here.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Parses git history, PRDs, and registry manifests</li>
                <li>Pulls performance + observability metrics from Chimera Heart</li>
                <li>Maps changes to Claude / ChatGPT / Gemini / Banterpacks personas</li>
                <li>Publishes searchable episodes with stats and change tracking</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="loop" className="mb-16">
          <div className="bg-gradient-to-r from-background to-muted/20 rounded-xl p-8 border border-border">
            <h2 className="text-3xl font-bold mb-6 text-center">Closed-Loop Feedback</h2>
            <div className="grid gap-6 md:grid-cols-4 text-sm text-muted-foreground">
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-2 text-foreground">1. Live Gameplay</h4>
                <p>Telemetry + viewer sentiment trigger Banterpacks overlay events.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-2 text-foreground">2. Banterhearts Ingest</h4>
                <p>Signals land in Chimera Heart for anonymization, validation, and RLHF training.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-2 text-foreground">3. Model Deployment</h4>
                <p>Quantized models roll out via the registry API, powering fresh overlay responses.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-2 text-foreground">4. Storytelling</h4>
                <p>Banterblogs ingests commits, metrics, and release notes to explain what changed and why.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="metrics" className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Key Metrics Snapshot</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 rounded-xl border border-border bg-card/60 text-center">
              <div className="text-3xl font-bold text-primary mb-2">&lt;200ms</div>
              <p className="text-sm text-muted-foreground">Banterpacks render budget (event → on-screen banter)</p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/60 text-center">
              <div className="text-3xl font-bold text-primary mb-2">&lt;100ms</div>
              <p className="text-sm text-muted-foreground">Banterhearts inference SLO for tuned banter suggestions</p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/60 text-center">
              <div className="text-3xl font-bold text-primary mb-2">24h</div>
              <p className="text-sm text-muted-foreground">Commit → retrain → redeploy cycle for new pack intelligence</p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/60 text-center">
              <div className="text-3xl font-bold text-primary mb-2">4+</div>
              <p className="text-sm text-muted-foreground">LLM providers managed simultaneously with health fallbacks</p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/60 text-center">
              <div className="text-3xl font-bold text-primary mb-2">90%+</div>
              <p className="text-sm text-muted-foreground">Target satisfaction score from Banterhearts feedback loop</p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/60 text-center">
              <div className="text-3xl font-bold text-primary mb-2">{formatNumber(stats.totalLinesAdded)}</div>
              <p className="text-sm text-muted-foreground">Lines of code captured in Banterblogs episodes</p>
            </div>
          </div>
        </section>

        <section id="deep-dive" className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Subsystem Deep Dive</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="p-6 rounded-xl border border-border bg-card/60 backdrop-blur">
              <h3 className="text-lg font-semibold mb-3">Banterpacks Overlay</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Event bus orchestrator with cooldown + dedupe windows</li>
                <li>Service worker + IndexedDB caching for offline resiliency</li>
                <li>Health panel exposing LLM, TTS, and STT adapter status</li>
                <li>Prometheus metrics and Grafana dashboards via registry</li>
              </ul>
              <Link
                href="/technology#overlay"
                className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:text-primary/80"
              >
                Explore Banterpacks details
              </Link>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/60 backdrop-blur">
              <h3 className="text-lg font-semibold mb-3">Banterhearts / Chimera Heart</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Multi-service FastAPI workers with GPU telemetry + alerting</li>
                <li>Quantization benchmarks (INT8 / FP8) and custom kernels</li>
                <li>Data governance: anonymization, encryption, audit logging</li>
                <li>CI coverage across unit, integration, performance, and ops tests</li>
              </ul>
              <Link
                href="/technology#chimera-heart"
                className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:text-primary/80"
              >
                See Banterhearts internals
              </Link>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card/60 backdrop-blur">
              <h3 className="text-lg font-semibold mb-3">Banterblogs Automation</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Episode generator consumes commits, PRDs, and patch notes</li>
                <li>Character templates keep roundtable voices consistent</li>
                <li>Stats pipeline tracks files changed, lines added, and reading time</li>
                <li>Onboarding + search surfaces help readers follow the saga</li>
              </ul>
              <Link
                href="/about#automation-loop"
                className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:text-primary/80"
              >
                Learn how episodes are produced
              </Link>
            </div>
          </div>
        </section>

        <section id="stats" className="mb-16">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="p-6 rounded-xl border border-border bg-card/60 text-center">
              <div className="text-3xl font-bold text-primary mb-2">{stats.totalEpisodes}</div>
              <div className="text-sm text-muted-foreground">Episodes Generated</div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/60 text-center">
              <div className="text-3xl font-bold text-primary mb-2">{formatNumber(stats.totalFilesChanged)}</div>
              <div className="text-sm text-muted-foreground">Files Touched</div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/60 text-center">
              <div className="text-3xl font-bold text-primary mb-2">{formatNumber(stats.totalLinesAdded)}</div>
              <div className="text-sm text-muted-foreground">Lines Added</div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card/60 text-center">
              <div className="text-3xl font-bold text-primary mb-2">{formatReadingTime(stats.totalReadingTime)}</div>
              <div className="text-sm text-muted-foreground">Total Reading Time</div>
            </div>
          </div>
        </section>

        <section id="next-steps" className="mb-16">
          <div className="bg-muted/20 border border-border rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Start Exploring</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-card/60 border border-border/60">
                <h3 className="font-semibold mb-2">About the Project</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Learn how the platform came together, the characters, and the storytelling engine that ships every episode.
                </p>
                <Link href="/about" className="text-sm font-medium text-primary hover:text-primary/80">
                  Read the About page
                </Link>
              </div>
              <div className="p-4 rounded-lg bg-card/60 border border-border/60">
                <h3 className="font-semibold mb-2">Technology Deep Dives</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Breakdowns of the overlay architecture, Chimera Heart infrastructure, and automation tooling—no private repos required.
                </p>
                <Link href="/technology" className="text-sm font-medium text-primary hover:text-primary/80">
                  Visit the Technology page
                </Link>
              </div>
              <div className="p-4 rounded-lg bg-card/60 border border-border/60">
                <h3 className="font-semibold mb-2">Episodes & Timeline</h3>
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
    </div>
  );
}
