'use client';

import { useEffect } from 'react';
import { adoptFragmentEntries } from './fragmentHistory';
import { onHistoryTraversal } from './historyTraversal';
import { watchScrollAnchors } from './scrollAnchor';

// How long a Back/Forward restore may take to land. The router restores the
// scroll position after it renders the page it goes back to; on the archive
// that lands within ~300 ms locally, so this leaves headroom for slow devices.
export const HISTORY_RESTORE_WINDOW_MS = 1500;

/**
 * Back/Forward restores the scroll position with window.scrollTo, which the
 * document's smooth scroll-behavior (kept for in-page anchors) would animate
 * down a long page. Hold the document at instant scrolling while a history
 * traversal (historyTraversal.ts) settles.
 *
 * It also hands the entries #jumps make to the router (fragmentHistory.ts),
 * so Back can return into them, and keeps each page's place as the reader
 * leaves it (scrollAnchor.ts), so Back returns to the same content.
 */
export function HistoryScrollGuard() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: number | undefined;
    const release = () => root.style.removeProperty('scroll-behavior');
    const hold = () => {
      root.style.scrollBehavior = 'auto';
      window.clearTimeout(timer);
      timer = window.setTimeout(release, HISTORY_RESTORE_WINDOW_MS);
    };
    const stopWatching = onHistoryTraversal(hold);
    const stopAdopting = adoptFragmentEntries();
    const stopAnchors = watchScrollAnchors();

    return () => {
      stopWatching();
      stopAdopting();
      stopAnchors();
      window.clearTimeout(timer);
      release();
    };
  }, []);
  return null;
}
