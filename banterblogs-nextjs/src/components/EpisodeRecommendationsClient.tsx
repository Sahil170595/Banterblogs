'use client';

import dynamic from 'next/dynamic';
import type { Episode } from '@/lib/episodes';

// Bottom-of-page "you might also like" recommendations. 183 LOC of
// framer-motion + 9 lucide icons. Sits well below the fold and is the
// last thing a reader interacts with.
//
// Lazy-loaded with ssr:false because it only matters once the user scrolls.
// Default loading state is null so it appears smoothly when the chunk
// resolves, without a layout-shifting placeholder.

const ContentRecommendations = dynamic(
  () => import('./ContentRecommendations').then((m) => m.ContentRecommendations),
  { ssr: false, loading: () => null },
);

interface EpisodeRecommendationsClientProps {
  currentEpisode: Episode;
  allEpisodes: Episode[];
}

export function EpisodeRecommendationsClient({
  currentEpisode,
  allEpisodes,
}: EpisodeRecommendationsClientProps) {
  return <ContentRecommendations currentEpisode={currentEpisode} allEpisodes={allEpisodes} />;
}
