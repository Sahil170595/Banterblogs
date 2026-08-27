import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getAllEpisodes, toEpisodeSummary } from '@/lib/episodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';

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
    <div className="container py-16">
      <div className="signal-panel-strong mb-12 p-8 md:p-10">
        <div className="space-y-4">
          <span className="signal-pill">Banterpacks</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Banterpacks Episodes</h1>
          <p className="text-lg text-muted-foreground">
            {banterpacksEpisodes.length} episodes covering development of the production monorepo — JARVIS gateway, intelligence pipeline, and constitutional AI.
          </p>
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Learn about Banterpacks on the Platform page
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <EpisodeFilters episodes={banterpacksEpisodes.map(toEpisodeSummary)} />
    </div>
  );
}
