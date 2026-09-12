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

export function EpisodeFloatingUI({ episode }: EpisodeFloatingUIProps) {
  return (
    <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] z-40 flex flex-col gap-2">
      <SocialShare episode={episode} />
      <BookmarkManager />
    </div>
  );
}
