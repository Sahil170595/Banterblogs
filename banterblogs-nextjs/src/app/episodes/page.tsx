import Link from 'next/link';
import { ArrowRight, Cpu, Radio, Sparkles } from 'lucide-react';
import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export const runtime = 'nodejs';

export default async function EpisodesPage() {
  const episodes = await getAllEpisodes();

  const banterpacksCount = episodes.filter(
    (ep) => ep.slug.startsWith('episode-') && !ep.slug.startsWith('chimera-episode-'),
  ).length;

  const chimeraCount = episodes.filter((ep) => ep.slug.startsWith('chimera-episode-')).length;

  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-12 p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <span className="signal-pill">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Chimera Timeline
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">All Episodes</h1>
            <p className="text-lg text-muted-foreground">
              The full development narrative across Banterpacks and Chimera Engine, from raw commits to benchmarked outcomes.
            </p>
          </div>
          <div className="grid gap-3 sm:min-w-[280px]">
            <Link
              href="/banterpacks"
              className="group flex items-center justify-between rounded-2xl border border-border/60 bg-primary/10 px-5 py-4 text-primary transition hover:bg-primary/15"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <Radio className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold">Banterpacks Episodes</div>
                  <div className="text-xs text-primary/80">{banterpacksCount} episodes</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary/80 transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="/chimera"
              className="group flex items-center justify-between rounded-2xl border border-border/60 bg-accent/10 px-5 py-4 text-accent transition hover:bg-accent/15"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <Cpu className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold">Chimera Episodes</div>
                  <div className="text-xs text-accent/80">{chimeraCount} episodes</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-accent/80 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      <EpisodeFilters episodes={episodes} />
    </div>
  );
}
