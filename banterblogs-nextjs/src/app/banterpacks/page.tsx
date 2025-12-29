import { Cpu, Radio, ShieldCheck } from 'lucide-react';
import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export const runtime = 'nodejs';

export default async function BanterpacksPage() {
  const episodes = await getAllEpisodes();

  const banterpacksEpisodes = episodes.filter(
    (ep) => ep.slug.startsWith('episode-') && !ep.slug.startsWith('chimera-episode-'),
  );

  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-12 p-8 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <span className="signal-pill">Banterpacks Overlay</span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Real-Time Streaming Intelligence</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Privacy-first streaming overlay platform. Real-time local processing with zero data collection and latency budgets tuned for live gameplay.
            </p>
          </div>
          <div className="grid gap-3 sm:min-w-[220px]">
            <div className="signal-panel p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Latency Target</div>
              <div className="mt-2 text-2xl font-bold text-foreground">&lt;200ms</div>
            </div>
            <div className="signal-panel p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Episode Archive</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{banterpacksEpisodes.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <div className="signal-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Radio className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-foreground">Core Features</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />Real-time overlay rendering</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />Local AI processing with no data collection</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />Privacy-first architecture with offline resilience</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />Cross-platform deployment targets</li>
          </ul>
        </div>

        <div className="signal-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Cpu className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-foreground">Tech Stack</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />WebRTC for low-latency streaming</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />WebGL pipeline for high-FPS rendering</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />Local ML inference with quantized models</li>
            <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />Electron wrapper for desktop distribution</li>
          </ul>
        </div>

        <div className="signal-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-foreground">Status</h3>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Core rendering complete
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              AI integration in progress
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Observability stack rolling out
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-3">Development Episodes</h2>
        <p className="text-muted-foreground">{banterpacksEpisodes.length} episodes covering Banterpacks development.</p>
      </div>

      <EpisodeFilters episodes={banterpacksEpisodes} />
    </div>
  );
}
