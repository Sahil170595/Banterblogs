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

const motionArmed = () =>
  document.documentElement.getAttribute(MOTION_ATTRIBUTE) === 'on' && typeof IntersectionObserver !== 'undefined';

// Reads only. Revealed once means revealed for good, wherever it has scrolled to since.
const belowFold = (el: HTMLElement, fold: number) =>
  el.getAttribute(REVEAL_ATTRIBUTE) !== REVEAL_SHOWN && el.getBoundingClientRect().top >= fold;

// The write: pending until the shared observer sees it enter.
function hold(el: HTMLElement): () => void {
  el.setAttribute(REVEAL_ATTRIBUTE, REVEAL_PENDING);
  shared ??= new IntersectionObserver(revealEntering, { rootMargin: REVEAL_ROOT_MARGIN });
  shared.observe(el);
  return () => shared?.unobserve(el);
}

/**
 * Holds an element back until it scrolls into view, then reveals it once.
 * Only content below the fold is held, and only while the pre-paint gate has
 * armed motion: what is on screen at mount stays at rest. Returns the cleanup
 * for unmount.
 */
export function armReveal(el: HTMLElement): (() => void) | undefined {
  if (!motionArmed() || !belowFold(el, window.innerHeight)) return undefined;
  return hold(el);
}

/**
 * Arms every marked target inside a container whose markup React sets as a
 * string (RevealScope), as armReveal arms one. Every target is measured
 * before any is held: a hold dirties style and layout, so measuring after
 * each one would force a layout per target. Returns the cleanup.
 */
export function armRevealScope(container: HTMLElement): (() => void) | undefined {
  if (!motionArmed()) return undefined;
  const fold = window.innerHeight;
  const below = [...container.querySelectorAll<HTMLElement>(`[${REVEAL_ATTRIBUTE}]`)].filter((el) => belowFold(el, fold));
  const releases = below.map(hold);
  return releases.length ? () => releases.forEach((release) => release()) : undefined;
}
