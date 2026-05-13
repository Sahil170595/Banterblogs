import type { Metadata } from 'next';
import { getAllEpisodes, toEpisodeSummary } from '@/lib/episodes';
import { EpisodeCard } from '@/components/EpisodeCard';
import { notFound } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const episodes = await getAllEpisodes();
  const count = episodes.filter((ep) =>
    ep.tags.some((t) => t.toLowerCase() === decodedTag.toLowerCase()),
  ).length;
  const title = `Tag: ${decodedTag}`;
  const description = `${count} episode${count !== 1 ? 's' : ''} tagged with "${decodedTag}" across the Chimeraforge dev log.`;
  const url = `https://chimeraforge.vercel.app/tags/${tag}`;
  return {
    title,
    description,
    openGraph: {
      title: `${title} | Chimeraforge`,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Chimeraforge`,
      description,
    },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const episodes = await getAllEpisodes();
  const filteredEpisodes = episodes
    .filter((episode) => episode.tags.some((t) => t.toLowerCase() === decodedTag.toLowerCase()))
    .map(toEpisodeSummary);

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
