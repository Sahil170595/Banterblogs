// The page a followed list or card link leaves answers the click at once:
// while the next page renders, everything in it but the kept element recedes
// (globals.css). The kept element is the link's shared figure when it has
// one (a report card's visual, which the next page morphs), else the link.

export const NAV_RECEDE_ATTRIBUTE = 'data-nav-recede';
const KEPT_SELECTOR = '.card-visual';

/**
 * Marks every element of the link's page that neither holds nor is the kept
 * element: at each level from the kept element up to <main>, its siblings.
 * Nothing nested is marked twice, so nothing recedes twice. Returns the undo.
 */
export function recedeAround(link: HTMLElement): () => void {
  const page = link.closest('main');
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
