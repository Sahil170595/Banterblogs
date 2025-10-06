import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';

export default async function ChimeraHubPage() {
  const episodes = await getAllEpisodes();
  // naive filter: any file with 'chimera' in slug/title/preview tags will already be reflected in list and filters
  const chimera = episodes.filter((e) => e.slug.includes('chimera') || /chimera|banterhearts|ml|ai/i.test(`${e.title} ${e.preview}`));

  return (
    <div className="container py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Building Chimera</h1>
        <p className="text-lg text-muted-foreground">Black–purple theme. All Chimera platform updates in one place.</p>
      </div>
      <EpisodeFilters episodes={chimera} />
    </div>
  );
}


