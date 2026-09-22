'use client';

import { useEffect } from 'react';

// How long a Back/Forward restore may take to land. The router restores the
// scroll position after it renders the page it goes back to; on the archive
// that lands within ~300 ms locally, so this leaves headroom for slow devices.
export const HISTORY_RESTORE_WINDOW_MS = 1500;

// The Navigation API's navigate event, where the browser has it (Chromium).
type NavigateEvent = Event & { navigationType?: string };

/**
 * Back/Forward restores the scroll position with window.scrollTo, which the
 * document's smooth scroll-behavior (kept for in-page anchors) would animate
 * down a long page. Hold the document at instant scrolling while a history
 * traversal settles. Following an #anchor link fires popstate as well, so a
 * traversal is recognised by the Navigation API's navigationType, or, without
 * that API, by the router state the history entry carries (an anchor's entry
 * has none).
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

    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const onNavigate = (event: Event) => {
      if ((event as NavigateEvent).navigationType === 'traverse') hold();
    };
    const onPopState = (event: PopStateEvent) => {
      if (event.state != null) hold();
    };
    if (navigation) navigation.addEventListener('navigate', onNavigate);
    else window.addEventListener('popstate', onPopState);

    return () => {
      if (navigation) navigation.removeEventListener('navigate', onNavigate);
      else window.removeEventListener('popstate', onPopState);
      window.clearTimeout(timer);
      release();
    };
  }, []);
  return null;
}
