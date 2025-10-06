import { getAllEpisodes } from '@/lib/episodes';
export const runtime = 'nodejs';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export default async function EpisodesPage() {
  const episodes = await getAllEpisodes();

  return (
    <div className="container py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">All Episodes</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Complete development timeline across Banterpacks and Chimera Engine.
        </p>
        
        <div className="flex gap-4 mb-8">
          <a 
            href="/banterpacks" 
            className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            View Banterpacks Episodes
          </a>
          <a 
            href="/chimera" 
            className="inline-flex items-center px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
          >
            View Chimera Episodes
          </a>
        </div>
      </div>

      <EpisodeFilters episodes={episodes} />
    </div>
  );
}
