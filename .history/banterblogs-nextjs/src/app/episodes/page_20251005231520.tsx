import { getAllEpisodes } from '@/lib/episodes';
export const runtime = 'nodejs';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export default async function EpisodesPage() {
  const episodes = await getAllEpisodes();

  // Count episodes by platform
  const banterpacksCount = episodes.filter(ep => 
    ep.slug.startsWith('episode-') && !ep.slug.startsWith('chimera-episode-')
  ).length;
  
  const chimeraCount = episodes.filter(ep => 
    ep.slug.startsWith('chimera-episode-')
  ).length;

  return (
    <div className="container py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">All Episodes</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Complete development timeline across Banterpacks and Chimera Engine.
        </p>
        
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <a 
            href="/banterpacks" 
            className="inline-flex items-center justify-between px-6 py-4 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            <div>
              <div className="font-semibold">Banterpacks Episodes</div>
              <div className="text-sm opacity-80">{banterpacksCount} episodes</div>
            </div>
            <div className="text-sm">→</div>
          </a>
          <a 
            href="/chimera" 
            className="inline-flex items-center justify-between px-6 py-4 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
          >
            <div>
              <div className="font-semibold">Chimera Episodes</div>
              <div className="text-sm opacity-80">{chimeraCount} episodes</div>
            </div>
            <div className="text-sm">→</div>
          </a>
        </div>
      </div>

      <EpisodeFilters episodes={episodes} />
    </div>
  );
}
