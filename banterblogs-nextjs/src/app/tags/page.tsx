import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { entranceItem } from '@/components/motion/entrance';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageHeader } from '@/components/ui/PageHeader';
import { getAllEpisodes } from '@/lib/episodes';

// The first row of the topic map joins the head's first-load entrance. The
// head has no meta row, so the first cell follows the lede one group later.
const ENTRANCE_CELLS = 3;
const HEAD_GROUPS = 2;

const METADATA_DESCRIPTION =
  'Browse episodes by topic — AI, benchmarks, deployment, architecture, and more.';

export const metadata: Metadata = {
  alternates: { canonical: '/tags' },
  title: 'Tags',
  description: METADATA_DESCRIPTION,
  // Archived blog stratum: keep the URLs, keep them out of the index.
  robots: { index: false, follow: true },
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'Tags | Chimeraforge',
    description: METADATA_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/tags',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tags | Chimeraforge',
    description: METADATA_DESCRIPTION,
  },
};

export default async function TagsPage() {
  const episodes = await getAllEpisodes();

  const tagCounts = episodes.reduce((acc, episode) => {
    episode.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }));

  return (
    <div className="container pb-24">
      <PageHeader
        eyebrow={<Eyebrow>Topic Map</Eyebrow>}
        title="Chimera Tags"
        lede="Explore the full signal surface by topic, platform, and technology."
      />

      {/* each cell is a link; its content rises into place while the rules hold still */}
      <ul className="hairline-grid mt-10 sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
        {sortedTags.map(({ tag, count }, index) => (
          <li key={tag}>
            <Link href={`/tags/${encodeURIComponent(tag)}`} className="tag-cell group">
              <Reveal className="flex items-center justify-between gap-4 p-5 md:p-6" {...(index < ENTRANCE_CELLS ? entranceItem(index, HEAD_GROUPS) : {})}>
                <div className="min-w-0">
                  <h2 className="text-heading-20 text-foreground transition-colors duration-fast ease-standard group-hover:text-primary">{tag}</h2>
                  <p className="mt-1 text-copy-14 text-muted-foreground">Signal cluster</p>
                </div>
                <span className="flex shrink-0 items-center gap-3 text-label-13 text-muted-foreground">
                  {count} episode{count !== 1 ? 's' : ''}
                  <ArrowRight aria-hidden="true" className="row-arrow h-4 w-4" />
                </span>
              </Reveal>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
