import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EpisodeRow } from '@/components/EpisodeRow';
import { ArrowLeft } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageHeader } from '@/components/ui/PageHeader';
import { getAllEpisodes, toEpisodeSummary } from '@/lib/episodes';

// The rows paint at once: a row's preview is often the largest text in view,
// and Chrome credits a fade from 0 to LCP only when it ends.

// Every topic is known at build: prerender them all, so a visit never runs
// the archive through the markdown pipeline on the request.
export async function generateStaticParams(): Promise<{ tag: string }[]> {
  const episodes = await getAllEpisodes();
  return [...new Set(episodes.flatMap((episode) => episode.tags))].map((tag) => ({ tag }));
}

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
        actions={
          <ButtonLink href="/tags" variant="ghost" size="sm" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
            Topic Map
          </ButtonLink>
        }
      />

      <ul className="mt-10 md:mt-14">
        {filteredEpisodes.map((episode) => (
          <Reveal as="li" key={episode.id}>
            <EpisodeRow episode={episode} />
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
