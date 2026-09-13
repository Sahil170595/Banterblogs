import { MOTION_ATTRIBUTE } from './prePaint';

export const REVEAL_ATTRIBUTE = 'data-reveal';
/**
 * The rest marker a server renderer writes on a reveal target, as the hast
 * and React property for data-reveal="": what <Reveal> renders, for markup
 * built outside React. A RevealScope arms what carries it.
 */
export const REVEAL_TARGET = { dataReveal: '' } as const;
export const REVEAL_PENDING = 'pending';
export const REVEAL_SHOWN = 'shown';
/** a batch entering together staggers over at most six steps (index 0-5) */
export const REVEAL_STAGGER_CAP = 5;
/** reveal once an element is this far inside the bottom edge, so the rise is seen */
const REVEAL_ROOT_MARGIN = '0px 0px -8% 0px';

let shared: IntersectionObserver | null = null;

// Entries arriving together are one batch: stagger them in reading order.
function revealEntering(entries: IntersectionObserverEntry[]) {
  const entering = entries
    .filter((entry) => entry.isIntersecting)
    .sort(
      (a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left,
    );
  entering.forEach((entry, order) => {
    const el = entry.target as HTMLElement;
    el.style.setProperty('--reveal-i', String(Math.min(order, REVEAL_STAGGER_CAP)));
    el.setAttribute(REVEAL_ATTRIBUTE, REVEAL_SHOWN);
    shared?.unobserve(el);
  });
}

/**
 * Holds an element back until it scrolls into view, then reveals it once.
 * Only content below the fold is held, and only while the pre-paint gate has
 * armed motion: what is on screen at mount stays at rest. Returns the cleanup
 * for unmount.
 */
export function armReveal(el: HTMLElement): (() => void) | undefined {
  if (document.documentElement.getAttribute(MOTION_ATTRIBUTE) !== 'on') return undefined;
  if (typeof IntersectionObserver === 'undefined') return undefined;
  // revealed once means revealed for good, wherever it has scrolled to since
  if (el.getAttribute(REVEAL_ATTRIBUTE) === REVEAL_SHOWN) return undefined;
  if (el.getBoundingClientRect().top < window.innerHeight) return undefined;
  el.setAttribute(REVEAL_ATTRIBUTE, REVEAL_PENDING);
  shared ??= new IntersectionObserver(revealEntering, { rootMargin: REVEAL_ROOT_MARGIN });
  shared.observe(el);
  return () => shared?.unobserve(el);
}

/**
 * Arms every marked target inside a container whose markup React sets as a
 * string (RevealScope), exactly as armReveal arms one. Returns the cleanup.
 */
export function armRevealScope(container: HTMLElement): (() => void) | undefined {
  const cleanups = [...container.querySelectorAll<HTMLElement>(`[${REVEAL_ATTRIBUTE}]`)]
    .map((el) => armReveal(el))
    .filter((cleanup): cleanup is () => void => cleanup !== undefined);
  return cleanups.length ? () => cleanups.forEach((cleanup) => cleanup()) : undefined;
}
