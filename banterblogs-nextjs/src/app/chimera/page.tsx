import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export const metadata: Metadata = {
  title: 'Chimera Engine Episodes',
  description: 'Development episodes covering the constitutional AI debate engine — heat-based escalation, multi-model consensus, and the RLAIF alignment loop.',
};

export const runtime = 'nodejs';

export default async function ChimeraPage() {
  const episodes = await getAllEpisodes();

  const chimeraEpisodes = episodes.filter((ep) => ep.slug.startsWith('chimera-episode-'));

  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-12 p-8 md:p-10">
        <div className="space-y-4">
          <span className="signal-pill">Chimera Engine</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Chimera Episodes</h1>
          <p className="text-lg text-muted-foreground">
            {chimeraEpisodes.length} episodes covering the constitutional AI debate engine and alignment architecture.
          </p>
          <Link
            href="/platform#overview"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Learn about Chimera on the Platform page
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <EpisodeFilters episodes={chimeraEpisodes} />
    </div>
  );
}
