import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeCard } from '@/components/EpisodeCard';
import { notFound } from 'next/navigation';

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const episodes = await getAllEpisodes();
  const filteredEpisodes = episodes.filter((episode) =>
    episode.tags.some((t) => t.toLowerCase() === decodedTag.toLowerCase())
  );

  if (filteredEpisodes.length === 0) {
    notFound();
  }

  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-10 p-8 md:p-10">
        <span className="signal-pill">Topic Focus</span>
        <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">{decodedTag}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {filteredEpisodes.length} episode{filteredEpisodes.length !== 1 ? 's' : ''} tagged with &ldquo;{decodedTag}&rdquo;.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEpisodes.map((episode, index) => (
          <EpisodeCard key={episode.id} episode={episode} index={index} />
        ))}
      </div>
    </div>
  );
}
