import type { Metadata } from 'next';
import { IntentLink } from '@/components/ui/IntentLink';
import { ArrowRight } from 'lucide-react';
import { getAllEpisodes, toEpisodeSummary } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';
import { ButtonLink } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageHeader } from '@/components/ui/PageHeader';

const METADATA_DESCRIPTION =
  'Full development timeline across Banterpacks and Chimera Engine — 268 episodes from raw commits to benchmarked outcomes, now archived.';

export const metadata: Metadata = {
  alternates: { canonical: '/episodes' },
  title: 'Episodes',
  description: METADATA_DESCRIPTION,
  openGraph: {
    images: ['/opengraph-image.png'],
    title: 'Episodes | Chimeraforge',
    description: METADATA_DESCRIPTION,
    url: 'https://chimeraforge.vercel.app/episodes',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Episodes | Chimeraforge',
    description: METADATA_DESCRIPTION,
  },
};

export const runtime = 'nodejs';

export default async function EpisodesPage() {
  const episodes = await getAllEpisodes();

  // Count by the frontmatter platform field, not slug prefix — custom slugs
  // like 'preliminary-data-review' (ep-001, platform: banterpacks) fall out of
  // prefix matching and made the labels sum to 267 instead of 268.
  const chimeraCount = episodes.filter((ep) => ep.platform === 'chimera').length;
  const banterpacksCount = episodes.length - chimeraCount;

  return (
    <div className="container pb-24">
      <PageHeader
        eyebrow={<Eyebrow dot="neutral">Archive</Eyebrow>}
        title="Episode Archive"
        lede="The full development narrative across Banterpacks and Chimera Engine, from raw commits to benchmarked outcomes."
        meta={
          <p className="max-w-[60ch] text-copy-14 text-muted-foreground">
            Archived 2026-06-26. These episodes were generated from git commits by a multi-persona pipeline between September 2025 and
            June 2026. The pipeline is retired; the research program continues at{' '}
            <IntentLink href="/reports" className="text-foreground underline decoration-foreground/35 underline-offset-4 transition-colors duration-fast ease-standard hover:decoration-primary">
              /reports
            </IntentLink>
            .
          </p>
        }
        actions={
          <>
            <ButtonLink href="/banterpacks" iconEnd={<ArrowRight className="h-3.5 w-3.5" />}>
              Banterpacks Episodes <span className="text-muted-foreground">{banterpacksCount} episodes</span>
            </ButtonLink>
            <ButtonLink href="/chimera" iconEnd={<ArrowRight className="h-3.5 w-3.5" />}>
              Chimera Episodes <span className="text-muted-foreground">{chimeraCount} episodes</span>
            </ButtonLink>
          </>
        }
      />

      <div className="mt-10 md:mt-14">
        <EpisodeFilters episodes={episodes.map(toEpisodeSummary)} />
      </div>
    </div>
  );
}
