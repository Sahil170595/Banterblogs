/**
 * A #fragment navigation (a contents link, the /work rail, the skip link)
 * makes a history entry without state, and the App Router ignores a popstate
 * without state: Back into that entry from another page changed the URL and
 * left the other page on screen. Next folds native replaceState calls into
 * its router, which then stamps its own state on the entry, so each such
 * entry is handed over at its own URL once the browser has made it. The jump
 * itself stays the browser's: its entry (Back returns to the section read
 * before), its scroll to scroll-padding-top, its focus starting point.
 * Returns the cleanup.
 */
export function adoptFragmentEntries(): () => void {
  const adopt = () => {
    if (history.state == null) history.replaceState(null, '', location.href);
  };
  window.addEventListener('hashchange', adopt);
  return () => window.removeEventListener('hashchange', adopt);
}
