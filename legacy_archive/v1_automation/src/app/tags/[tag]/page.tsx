import type { PageProps } from 'next';
import { getAllEpisodes } from '@/lib/episodes';
import { EpisodeCard } from '@/components/EpisodeCard';
import { notFound } from 'next/navigation';

export type TagPageProps = PageProps<{ tag: string }>;

export async function generateStaticParams() {
  const episodes = await getAllEpisodes();
  const tags = new Set<string>();
  
  episodes.forEach(episode => {
    episode.tags.forEach(tag => tags.add(tag));
  });
  
  return Array.from(tags).map((tag) => ({
    tag: encodeURIComponent(tag),
  }));
}

const TagPage: (props: TagPageProps) => Promise<JSX.Element> = async (props) => {
  const { tag } = await props.params;
  const decodedTag = decodeURIComponent(tag);
  const episodes = await getAllEpisodes();
  const filteredEpisodes = episodes.filter(episode => 
    episode.tags.some(t => t.toLowerCase() === decodedTag.toLowerCase())
  );

  if (filteredEpisodes.length === 0) {
    notFound();
  }

  return (
    <div className="container py-16">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Tag: {decodedTag}
        </h1>
        <p className="text-xl text-muted-foreground">
          {filteredEpisodes.length} episode{filteredEpisodes.length !== 1 ? 's' : ''} tagged with &ldquo;{decodedTag}&rdquo;
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEpisodes.map((episode, index) => (
          <EpisodeCard key={episode.id} episode={episode} index={index} />
        ))}
      </div>
    </div>
  );
};

export default TagPage;
