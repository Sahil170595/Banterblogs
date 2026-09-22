import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { getAllEpisodes, toEpisodeSummary } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';
import { ButtonLink } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageHeader } from '@/components/ui/PageHeader';

const METADATA_DESCRIPTION =
  'Development episodes covering the constitutional AI debate engine — heat-based escalation, multi-model consensus, and the RLAIF alignment loop.';

export const metadata: Metadata = {
  alternates: { canonical: '/chimera' },
  title: 'Chimera Engine Episodes',
  description: METADATA_DESCRIPTION,
  // Archived blog stratum: keep the URLs, keep them out of the index.
  robots: { index: false, follow: true },
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'Chimera Engine Episodes | Chimeraforge',
    description: METADATA_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/chimera',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chimera Engine Episodes | Chimeraforge',
    description: METADATA_DESCRIPTION,
  },
};

export const runtime = 'nodejs';

// the head's entrance groups: the title, then the platform button (the lede paints at once)
const HEAD_GROUPS = 2;

export default async function ChimeraPage() {
  const episodes = await getAllEpisodes();

  const chimeraEpisodes = episodes.filter((ep) => ep.slug.startsWith('chimera-episode-'));

  return (
    <div className="container pb-24">
      <PageHeader
        eyebrow={<Eyebrow>Chimera Engine</Eyebrow>}
        title="Chimera Episodes"
        stillLede
        lede={`${chimeraEpisodes.length} episodes covering the constitutional AI debate engine and alignment architecture.`}
        actions={
          <ButtonLink href="/platform" iconEnd={<ArrowRight className="h-3.5 w-3.5" />}>
            Learn about Chimera on the Platform page
          </ButtonLink>
        }
      />

      <div className="mt-10 md:mt-14">
        <EpisodeFilters episodes={chimeraEpisodes.map(toEpisodeSummary)} entranceAfter={HEAD_GROUPS} />
      </div>
    </div>
  );
}
