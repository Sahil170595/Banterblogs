import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { adoptFragmentEntries } from '../fragmentHistory';

// R6 bug 1: a contents link's #jump is a fragment navigation, and the entry
// the browser makes for it carries no state. The App Router ignores a
// popstate without state, so Back into that entry from another page changed
// the URL to /reports/technical-report-142#references and left /papers on
// screen. Next folds native replaceState calls into its router (the patched
// replaceState dispatches a restore, and the router stamps its state on the
// entry), so once the browser has made such an entry it is handed over at
// the same URL: the jump keeps its own entry, and Back still steps through
// the sections read.

const REPORT = '/reports/technical-report-142';

describe('entries made by a #fragment navigation', () => {
  let stop: () => void;
  let replaceState: MockInstance<History['replaceState']>;

  beforeEach(() => {
    history.replaceState({ __NA: true }, '', REPORT);
    stop = adoptFragmentEntries();
    replaceState = vi.spyOn(history, 'replaceState');
  });

  afterEach(() => {
    stop();
    replaceState.mockRestore();
    history.replaceState(null, '', '/');
  });

  // what the browser leaves after following <a href="#references">: a new
  // entry without state, then a hashchange; returns the history length then
  const followFragment = (hash: string) => {
    history.pushState(null, '', hash);
    const length = history.length;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return length;
  };

  it('hands the entry to the router, at the same URL, without adding one', () => {
    const length = followFragment('#references');
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith(null, '', `${location.origin}${REPORT}#references`);
    expect(history.length).toBe(length);
  });

  it('leaves alone an entry that already carries state (Back or Forward between two jumps)', () => {
    history.pushState({ __NA: true }, '', '#methods');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('stops once cleaned up', () => {
    stop();
    followFragment('#references');
    expect(replaceState).not.toHaveBeenCalled();
  });
});
