import { SKIPPED_BLOCKS } from './contentVisibility';

// Back and Forward restore a page's scroll position as a number, into a page
// rendered afresh with its off-screen blocks skipped at estimated heights
// (contentVisibility.ts), so the same scrollY shows other content. Each
// history entry keeps the block at the top of the view and its offset, taken
// as the reader leaves; once a traversal has rendered the page again, that
// block goes back to the same offset, and only the blocks near that view
// render for real first.

export interface ScrollAnchor {
  /** child indices from <main> down to the block */
  path: number[];
  /** tag names along the path: a page that rendered otherwise is left alone */
  tags: string[];
  /** the block's layout top in the view */
  top: number;
}

/** descend until a block fits in this share of the view */
export const ANCHOR_VIEWPORT_SHARE = 0.5;
/** history entries remembered; the oldest go first */
export const ANCHOR_ENTRIES_KEPT = 50;
/**
 * Skipped blocks up to this many views above the restored view, and in it,
 * render for real before the anchor is measured: the ones the next frame
 * would draw anyway (content-visibility: auto), at other heights. Half a
 * view left the archive 71px off in Chromium and TR142 up to 345px off in
 * Firefox; both draw further than that.
 */
export const ANCHOR_RENDER_MARGIN_VIEWS = 1;
/** render-then-measure passes; each draws what a moved view brings near */
export const ANCHOR_RENDER_PASSES = 4;

const OUT_OF_FLOW = new Set(['absolute', 'fixed']);
const RENDERED = 'visible';
const anchors = new Map<string, ScrollAnchor>();
// entries whose anchor is held (holdScrollAnchor)
const held = new Set<string>();

type NavigationLike = EventTarget & { currentEntry?: { key: string } | null };
type NavigateEvent = Event & { navigationType?: string; destination?: { url: string; key: string } };
const navigationApi = () => (window as Window & { navigation?: NavigationLike }).navigation;

/** the history entry the page shows: its Navigation API key, else its URL */
export function currentEntryKey(): string {
  return navigationApi()?.currentEntry?.key ?? location.href;
}

// the top of an element's box as laid out; offsetTop leaves out the transform
// a reveal (revealObserver.ts) holds content at while it waits
function layoutTop(el: HTMLElement): number {
  let top = 0;
  for (let node: Element | null = el; node instanceof HTMLElement; node = node.offsetParent) top += node.offsetTop;
  return top;
}

// where reading starts: under the sticky header, as the jumps land
const readingLine = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;

// The first in-flow child still showing below the line. A disclosure is
// passed over: rendered again, it comes back closed, so what was read inside
// it, or placed by its open height, is not where it was.
function firstShowing(parent: Element, line: number): number {
  const kids = parent.children;
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i];
    if (!(kid instanceof HTMLElement) || kid instanceof HTMLDetailsElement) continue;
    const box = kid.getBoundingClientRect();
    if (box.height > 0 && box.bottom > line && !OUT_OF_FLOW.has(getComputedStyle(kid).position)) return i;
  }
  return -1;
}

/** Keeps, for this history entry, the block at the top of the view and its offset. */
export function rememberScrollAnchor(key: string = currentEntryKey()): void {
  if (held.has(key)) return;
  const main = document.querySelector('main');
  anchors.delete(key);
  if (!main) return;
  const line = readingLine();
  const tallest = window.innerHeight * ANCHOR_VIEWPORT_SHARE;
  const path: number[] = [];
  const tags: string[] = [];
  let node: Element = main;
  for (let index = firstShowing(node, line); index >= 0; index = firstShowing(node, line)) {
    node = node.children[index];
    path.push(index);
    tags.push(node.tagName);
    if (node.getBoundingClientRect().height <= tallest) break;
  }
  if (!(node instanceof HTMLElement) || node === main) return;
  anchors.set(key, { path, tags, top: layoutTop(node) - window.scrollY });
  if (anchors.size > ANCHOR_ENTRIES_KEPT) anchors.delete(anchors.keys().next().value!);
}

/**
 * Takes this entry's anchor now and keeps it until released: chrome that
 * moves the page while it is open (the phone menu pushes it down by its
 * panel) must not stand in for where the reader was. Returns the release.
 */
export function holdScrollAnchor(): () => void {
  const key = currentEntryKey();
  held.delete(key);
  rememberScrollAnchor(key);
  held.add(key);
  return () => {
    held.delete(key);
  };
}

function findAnchor(anchor: ScrollAnchor): HTMLElement | null {
  let node: Element | null = document.querySelector('main');
  for (let depth = 0; node && depth < anchor.path.length; depth++) {
    node = node.children[anchor.path[depth]] ?? null;
    if (node && node.tagName !== anchor.tags[depth]) return null;
  }
  return node instanceof HTMLElement ? node : null;
}

// Whether a block's own box is laid out: its container is not inside a block
// still skipping its contents, whose geometry a read would force laid out
// (the next pass reaches it once that block renders). jsdom has no
// checkVisibility.
const laidOut = (block: HTMLElement) => {
  const container = block.parentElement;
  return !container || typeof container.checkVisibility !== 'function' || container.checkVisibility({ contentVisibilityAuto: true });
};

// Renders for real the skipped blocks the view whose top is `viewTop` brings
// near above it, and those in it, adding them to `drawn`; says whether there
// were any. Above the view they would move the anchor; in it, the element the
// browser anchors its own scroll to. Below the view nothing moves. One box
// read a block (a reveal's transform does not matter here). Reads, then
// writes.
function renderNear(anchor: HTMLElement, viewTop: number, blocks: HTMLElement[], drawn: HTMLElement[]): boolean {
  const scrollY = window.scrollY;
  const from = viewTop - window.innerHeight * ANCHOR_RENDER_MARGIN_VIEWS - scrollY;
  const to = viewTop + window.innerHeight - scrollY;
  const near = blocks.filter((block) => {
    // (a block holding the anchor counts too: until the view moves there, it
    // may still be skipped, the anchor inside it laid out only when read)
    if (block.style.contentVisibility === RENDERED || !laidOut(block)) return false;
    const box = block.getBoundingClientRect();
    return box.top < to && box.bottom > from;
  });
  for (const block of near) block.style.contentVisibility = RENDERED;
  drawn.push(...near);
  return near.length > 0;
}

/**
 * Puts this entry's block back at its offset, if the page rendered the same.
 * The skipped blocks above and in that view render first, so the offset is
 * taken from the heights the next frame draws; they go back to skipping once
 * drawn, at the size they were drawn at (contain-intrinsic-size: auto).
 */
export function restoreScrollAnchor(key: string = currentEntryKey()): void {
  const anchor = anchors.get(key);
  const el = anchor ? findAnchor(anchor) : null;
  if (!anchor || !el) return;
  const blocks = [...document.querySelectorAll<HTMLElement>(SKIPPED_BLOCKS)];
  const drawn: HTMLElement[] = [];
  let top = layoutTop(el) - anchor.top;
  for (let pass = 0; pass < ANCHOR_RENDER_PASSES && renderNear(el, top, blocks, drawn); pass++) top = layoutTop(el) - anchor.top;
  if (Math.round(top) !== Math.round(window.scrollY)) window.scrollTo({ top, left: window.scrollX, behavior: 'instant' });
  // the frame after next: the next one draws them and records their size
  if (drawn.length) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        for (const block of drawn) block.style.contentVisibility = '';
      }),
    );
  }
}

/** for tests */
export function forgetScrollAnchors(): void {
  anchors.clear();
  held.clear();
}

const samePage = (url: URL) => url.pathname === location.pathname && url.search === location.search;

/**
 * Takes the anchor as the reader leaves the entry: at a click on a link to
 * another page or to a #fragment of this one, on the window, before the
 * pre-paint gate changes skipping (contentVisibility.ts) and before the
 * router renders the next page; and as Back or Forward leaves it, where the
 * Navigation API says so. A script navigation calls rememberScrollAnchor
 * itself. Back or Forward within the page restores the destination's anchor
 * once the traversal has committed (popstate), a frame after the browser's
 * own restore: Firefox runs frames between the navigate event and the
 * commit, and saves the leaving entry's position at the commit. To another
 * page, RouteArrival restores, once that page has committed. Returns the
 * cleanup.
 */
export function watchScrollAnchors(): () => void {
  let samePageTraversal: string | null = null;
  const onClick = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self')) return;
    const to = new URL(link.href, location.href);
    if (to.origin !== location.origin || (samePage(to) && !to.hash)) return;
    rememberScrollAnchor();
  };
  const onNavigate = (event: Event) => {
    const { navigationType, destination } = event as NavigateEvent;
    if (navigationType !== 'traverse') return;
    rememberScrollAnchor();
    samePageTraversal = destination && samePage(new URL(destination.url)) ? destination.key : null;
  };
  const onCommit = () => {
    const key = samePageTraversal;
    samePageTraversal = null;
    if (key !== null) requestAnimationFrame(() => restoreScrollAnchor(key));
  };
  const navigation = navigationApi();
  window.addEventListener('click', onClick, true);
  window.addEventListener('popstate', onCommit);
  navigation?.addEventListener('navigate', onNavigate);
  return () => {
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('popstate', onCommit);
    navigation?.removeEventListener('navigate', onNavigate);
  };
}
