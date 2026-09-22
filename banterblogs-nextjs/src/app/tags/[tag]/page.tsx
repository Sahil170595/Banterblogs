import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EpisodeRow } from '@/components/EpisodeRow';
import { Reveal } from '@/components/motion/Reveal';
import { entranceItem } from '@/components/motion/entrance';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageHeader } from '@/components/ui/PageHeader';
import { getAllEpisodes, toEpisodeSummary } from '@/lib/episodes';

// The first rows join the head's first-load entrance. The head has no meta
// row, so the first row follows the lede one group later.
const ENTRANCE_ROWS = 3;
const HEAD_GROUPS = 2;

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
    alternates: { canonical: url },
    // Archived blog stratum: keep the URLs, keep them out of the index.
    robots: { index: false, follow: true },
    openGraph: {
      images: ['/opengraph-image.png'],
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

  // Every row is server markup, so the whole topic is in the page without
  // JavaScript and its episode links stay followable.
  return (
    <div className="container pb-24">
      <PageHeader
        eyebrow={<Eyebrow>Topic Focus</Eyebrow>}
        title={decodedTag}
        lede={`${filteredEpisodes.length} episode${filteredEpisodes.length !== 1 ? 's' : ''} tagged with “${decodedTag}”.`}
      />

      <ul className="mt-10 md:mt-14">
        {filteredEpisodes.map((episode, index) => (
          <Reveal as="li" key={episode.id} {...(index < ENTRANCE_ROWS ? entranceItem(index, HEAD_GROUPS) : {})}>
            <EpisodeRow episode={episode} />
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
