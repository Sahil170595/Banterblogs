import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
        <div className="space-y-4">
          <span className="signal-pill">Banterpacks</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Banterpacks Episodes</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {banterpacksEpisodes.length} episodes covering development of the production monorepo — JARVIS gateway, intelligence pipeline, and constitutional AI.
          </p>
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Learn about Banterpacks on the Platform page
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <EpisodeFilters episodes={banterpacksEpisodes} />
    </div>
  );
}
