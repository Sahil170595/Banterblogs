import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Cpu, Radio, Sparkles } from 'lucide-react';
import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export const metadata: Metadata = {
  title: 'Episodes',
  description: 'Full development timeline across Banterpacks and Chimera Engine — 266+ episodes from raw commits to benchmarked outcomes.',
};

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
          <div className="space-y-4">
            <span className="signal-pill">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              Chimera Timeline
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">All Episodes</h1>
            <p className="text-lg text-muted-foreground">
              The full development narrative across Banterpacks and Chimera Engine, from raw commits to benchmarked outcomes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:min-w-[560px]">
            <Link
              href="/banterpacks"
              className="group flex items-center justify-between rounded-2xl border border-primary/40 bg-card/60 px-5 py-4 text-foreground transition hover:border-primary hover:bg-card/80"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Radio className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold">Banterpacks Episodes</div>
                  <div className="text-xs text-muted-foreground">{banterpacksCount} episodes</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="/chimera"
              className="group flex items-center justify-between rounded-2xl border border-primary/40 bg-card/60 px-5 py-4 text-foreground transition hover:border-primary hover:bg-card/80"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Cpu className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold">Chimera Episodes</div>
                  <div className="text-xs text-muted-foreground">{chimeraCount} episodes</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      <EpisodeFilters episodes={episodes} />
    </div>
  );
}
