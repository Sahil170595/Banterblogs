'use client';

import dynamic from 'next/dynamic';
import type { EpisodeSummary } from '@/lib/episodes';

// Floating action UI on /episodes/[slug] (bottom-right corner): 11 lucide
// icons and localStorage state, used only after the reader engages with the
// page. Lazy-loaded so it does not block first paint on episode pages.

const SocialShare = dynamic(
  () => import('./SocialFeatures').then((m) => m.SocialShare),
  { ssr: false },
);
const BookmarkManager = dynamic(
  () => import('./SocialFeatures').then((m) => m.BookmarkManager),
  { ssr: false },
);

interface EpisodeFloatingUIProps {
  episode: EpisodeSummary;
}

// Below md the stack rides 3.5rem higher, clear of the prev/next pill
// (MobileOptimization) in the bottom band; from md the pill is gone.
export function EpisodeFloatingUI({ episode }: EpisodeFloatingUIProps) {
  return (
    <div className="fixed bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+3.5rem)] right-[max(1.5rem,env(safe-area-inset-right))] z-40 flex flex-col gap-2 md:bottom-[max(1.5rem,env(safe-area-inset-bottom))]">
      <SocialShare episode={episode} />
      <BookmarkManager />
    </div>
  );
}
