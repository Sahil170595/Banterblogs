'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Episode } from '@/lib/episodes';

interface EpisodeNavigationProps {
  prevEpisode: Episode | null;
  nextEpisode: Episode | null;
}

export function EpisodeNavigation({ prevEpisode, nextEpisode }: EpisodeNavigationProps) {
  return (
    <div className="mt-16 pt-8 border-t border-border">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {prevEpisode && (
          <Link
            href={`/episodes/${prevEpisode.slug}`}
            className="group flex items-center space-x-4 rounded-lg border border-border p-4 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground" />
            <div>
              <div className="text-sm text-muted-foreground group-hover:text-accent-foreground">
                Previous Episode
              </div>
              <div className="font-medium">{prevEpisode.title}</div>
            </div>
          </Link>
        )}
        
        {nextEpisode && (
          <Link
            href={`/episodes/${nextEpisode.slug}`}
            className="group flex items-center space-x-4 rounded-lg border border-border p-4 hover:bg-accent hover:text-accent-foreground transition-colors md:ml-auto"
          >
            <div className="text-right">
              <div className="text-sm text-muted-foreground group-hover:text-accent-foreground">
                Next Episode
              </div>
              <div className="font-medium">{nextEpisode.title}</div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground" />
          </Link>
        )}
      </div>
    </div>
  );
}
