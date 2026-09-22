import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { getAllEpisodes, toEpisodeSummary } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';
import { ButtonLink } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageHeader } from '@/components/ui/PageHeader';

const METADATA_DESCRIPTION =
  'Development episodes from the production monorepo — JARVIS gateway, intelligence pipeline, constitutional AI, and Rust runtime.';

export const metadata: Metadata = {
  alternates: { canonical: '/banterpacks' },
  title: 'Banterpacks Episodes',
  description: METADATA_DESCRIPTION,
  // Archived blog stratum: keep the URLs, keep them out of the index.
  robots: { index: false, follow: true },
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'Banterpacks Episodes | Chimeraforge',
    description: METADATA_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/banterpacks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Banterpacks Episodes | Chimeraforge',
    description: METADATA_DESCRIPTION,
  },
};

export const runtime = 'nodejs';

export default async function BanterpacksPage() {
  const episodes = await getAllEpisodes();

  const banterpacksEpisodes = episodes.filter(
    (ep) => ep.slug.startsWith('episode-') && !ep.slug.startsWith('chimera-episode-'),
  );

  return (
    <div className="container pb-24">
      <PageHeader
        eyebrow={<Eyebrow>Banterpacks</Eyebrow>}
        title="Banterpacks Episodes"
        lede={`${banterpacksEpisodes.length} episodes covering development of the production monorepo — JARVIS gateway, intelligence pipeline, and constitutional AI.`}
        actions={
          <ButtonLink href="/platform" iconEnd={<ArrowRight className="h-3.5 w-3.5" />}>
            Learn about Banterpacks on the Platform page
          </ButtonLink>
        }
      />

      <div className="mt-10 md:mt-14">
        <EpisodeFilters episodes={banterpacksEpisodes.map(toEpisodeSummary)} />
      </div>
    </div>
  );
}
