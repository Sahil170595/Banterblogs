// The Navigation API's navigate event, where the browser has it (Chromium).
type NavigateEvent = Event & { navigationType?: string };

/**
 * Calls back on every Back/Forward traversal. Following an #anchor link
 * fires popstate as well, so a traversal is recognised by the Navigation
 * API's navigationType, or, without that API, by the router state the
 * history entry carries (an anchor's entry has none as it is made;
 * fragmentHistory.ts hands it to the router after). Returns the cleanup.
 */
export function onHistoryTraversal(listener: () => void): () => void {
  const navigation = (window as Window & { navigation?: EventTarget }).navigation;
  const onNavigate = (event: Event) => {
    if ((event as NavigateEvent).navigationType === 'traverse') listener();
  };
  const onPopState = (event: PopStateEvent) => {
    if (event.state != null) listener();
  };
  if (navigation) navigation.addEventListener('navigate', onNavigate);
  else window.addEventListener('popstate', onPopState);
  return () => {
    if (navigation) navigation.removeEventListener('navigate', onNavigate);
    else window.removeEventListener('popstate', onPopState);
  };
}
