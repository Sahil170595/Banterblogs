import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export default async function EpisodesPage() {
  const episodes = await getAllEpisodes();

  return (
    <div className="container py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">All Episodes</h1>
        <p className="text-xl text-muted-foreground">
          The complete development journey of Banterpacks, episode by episode.
        </p>
      </div>

      <EpisodeFilters episodes={episodes} />
    </div>
  );
}
