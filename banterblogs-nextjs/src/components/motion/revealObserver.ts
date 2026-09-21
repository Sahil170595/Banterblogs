import { MOTION_ATTRIBUTE } from './prePaint';

export const REVEAL_ATTRIBUTE = 'data-reveal';
export const REVEAL_PENDING = 'pending';
export const REVEAL_SHOWN = 'shown';
/** a batch entering together staggers over at most six steps (index 0-5) */
export const REVEAL_STAGGER_CAP = 5;
/** reveal once an element is this far inside the bottom edge, so the rise is seen */
const REVEAL_ROOT_MARGIN = '0px 0px -8% 0px';

let shared: IntersectionObserver | null = null;
// armed since the last measuring pass, in mount order
const waiting = new Set<HTMLElement>();
let passQueued = false;

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

// One pass for everything armed in a task: measure it all, then hold what
// sits below the fold. A hold dirties style and layout, so measuring after
// each one would force a layout per element.
function measureThenHold() {
  passQueued = false;
  const batch = [...waiting];
  waiting.clear();
  if (!motionArmed()) return;
  const fold = window.innerHeight;
  const below = batch.filter(
    (el) => el.isConnected && el.getAttribute(REVEAL_ATTRIBUTE) !== REVEAL_SHOWN && el.getBoundingClientRect().top >= fold,
  );
  if (!below.length) return;
  shared ??= new IntersectionObserver(revealEntering, { rootMargin: REVEAL_ROOT_MARGIN });
  for (const el of below) {
    el.setAttribute(REVEAL_ATTRIBUTE, REVEAL_PENDING);
    shared.observe(el);
  }
}

/**
 * Holds an element back until it scrolls into view, then reveals it once.
 * Only content below the fold is held, and only while the pre-paint gate has
 * armed motion: what is on screen at mount stays at rest. Everything armed in
 * one task is measured together in a microtask, before the next paint.
 * Returns the cleanup for unmount.
 */
export function armReveal(el: HTMLElement): (() => void) | undefined {
  // revealed once means revealed for good, wherever it has scrolled to since
  if (!motionArmed() || el.getAttribute(REVEAL_ATTRIBUTE) === REVEAL_SHOWN) return undefined;
  waiting.add(el);
  if (!passQueued) {
    passQueued = true;
    queueMicrotask(measureThenHold);
  }
  return () => {
    waiting.delete(el);
    shared?.unobserve(el);
  };
}
