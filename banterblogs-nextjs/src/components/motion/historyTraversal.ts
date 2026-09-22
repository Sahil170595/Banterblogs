// The Navigation API's navigate event, where the browser has it (Chromium).
type NavigateEvent = Event & { navigationType?: string; destination?: { url: string } };

/**
 * Calls back on every Back/Forward traversal, with the path it goes to.
 * Following an #anchor link fires popstate as well, so a traversal is
 * recognised by the Navigation API's navigationType, or, without that API,
 * by the router state the history entry carries (an anchor's entry has none
 * as it is made; fragmentHistory.ts hands it to the router after). The
 * navigate event comes before the entry is current, so the destination is
 * read from the event; popstate comes after, so location is already it.
 * Returns the cleanup.
 */
export function onHistoryTraversal(listener: (destination: string) => void): () => void {
  const navigation = (window as Window & { navigation?: EventTarget }).navigation;
  const onNavigate = (event: Event) => {
    const { navigationType, destination } = event as NavigateEvent;
    if (navigationType === 'traverse') listener(new URL(destination?.url ?? location.href).pathname);
  };
  const onPopState = (event: PopStateEvent) => {
    if (event.state != null) listener(location.pathname);
  };
  if (navigation) navigation.addEventListener('navigate', onNavigate);
  else window.addEventListener('popstate', onPopState);
  return () => {
    if (navigation) navigation.removeEventListener('navigate', onNavigate);
    else window.removeEventListener('popstate', onPopState);
  };
}
