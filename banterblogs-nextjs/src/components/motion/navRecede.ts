// The page a followed list or card link leaves answers the click at once:
// while the next page renders, everything in it but the kept element recedes
// (globals.css). The kept element is the link's shared figure when it has
// one (a report card's visual, which the next page morphs), else the link.

export const NAV_RECEDE_ATTRIBUTE = 'data-nav-recede';
// Bounds the recede inside a page: the landing's copy layer, so the scene
// behind it stays lit for the push into the next page.
export const NAV_RECEDE_SCOPE_ATTRIBUTE = 'data-nav-scope';
const KEPT_SELECTOR = '.card-visual';

/**
 * A navigation that has not replaced the page by then did not happen, or led
 * back to this same page: the page comes back. Prefetched pages replace it
 * within a few hundred milliseconds.
 */
export const NAV_RECEDE_RESET_MS = 2000;

// A client navigation began from a link on this page. What the page runs on
// its own (the landing's scene) stands still while the next page renders.
export const NAV_START_EVENT = 'chimera:nav-start';

export function announceNavigation(): void {
  window.dispatchEvent(new Event(NAV_START_EVENT));
}

/**
 * Marks every element of the link's page that neither holds nor is the kept
 * element: at each level from the kept element up to <main> (or the nearest
 * recede scope), its siblings. Nothing nested is marked twice, so nothing
 * recedes twice. Returns the undo.
 */
export function recedeAround(link: HTMLElement): () => void {
  const main = link.closest('main');
  const scope = link.closest(`[${NAV_RECEDE_SCOPE_ATTRIBUTE}]`);
  const page = scope && main?.contains(scope) ? scope : main;
  if (!page) return () => undefined;
  const kept = link.querySelector<HTMLElement>(KEPT_SELECTOR) ?? link;
  const marked: Element[] = [];
  for (let node: Element = kept; node !== page && node.parentElement; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling === node) continue;
      sibling.setAttribute(NAV_RECEDE_ATTRIBUTE, '');
      marked.push(sibling);
    }
  }
  return () => marked.forEach((el) => el.removeAttribute(NAV_RECEDE_ATTRIBUTE));
}
