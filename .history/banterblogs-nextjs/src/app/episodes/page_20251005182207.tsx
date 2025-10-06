import { getAllEpisodes } from '@/lib/episodes';
export const runtime = 'nodejs';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export default async function EpisodesPage() {
  const episodes = await getAllEpisodes();

  // Split episodes by theme
  const banterpacksEpisodes = episodes.filter(ep =>
    !ep.slug.includes('chimera') &&
    !/chimera|banterhearts|ml|ai/i.test(`${ep.title} ${ep.preview}`)
  );

  const chimeraEpisodes = episodes.filter(ep =>
    ep.slug.includes('chimera') ||
    /chimera|banterhearts|ml|ai/i.test(`${ep.title} ${ep.preview}`)
  );

  return (
    <div className="container py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">All Episodes</h1>
        <p className="text-xl text-muted-foreground">
          The complete development journey split by platform.
        </p>
      </div>

      <div className="space-y-16">
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Banterpacks</h2>
            <p className="text-lg text-muted-foreground">
              Streaming overlay and privacy-first platform development ({banterpacksEpisodes.length} episodes)
            </p>
          </div>
          <EpisodeFilters episodes={banterpacksEpisodes} />
        </section>

        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Chimera Engine</h2>
            <p className="text-lg text-muted-foreground">
              ML platform and AI orchestration ({chimeraEpisodes.length} episodes)
            </p>
          </div>
          <EpisodeFilters episodes={chimeraEpisodes} />
        </section>
      </div>
    </div>
  );
}
