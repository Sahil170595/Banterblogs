'use client';

import dynamic from 'next/dynamic';
import type { Episode } from '@/lib/episodes';

// Floating action UI on /episodes/[slug] (bottom-right corner). Pulls
// framer-motion + 11 lucide icons. Not visible above the fold and only
// used after the user starts engaging with the page.
//
// Lazy-loaded so framer-motion does not block first paint on episode
// detail pages.

const SocialShare = dynamic(
  () => import('./SocialFeatures').then((m) => m.SocialShare),
  { ssr: false },
);
const BookmarkManager = dynamic(
  () => import('./SocialFeatures').then((m) => m.BookmarkManager),
  { ssr: false },
);

interface EpisodeFloatingUIProps {
  episode: Episode;
}

export function EpisodeFloatingUI({ episode }: EpisodeFloatingUIProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
      <SocialShare episode={episode} />
      <BookmarkManager />
    </div>
  );
}
