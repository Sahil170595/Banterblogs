// A choice made in a demo's table often changes a result further down the
// page. revealResult brings that result into view when it is off screen and
// marks it for a moment (.demo-revealed in reading.css), so the visitor sees
// what their click did.

export const REVEALED_CLASS = 'demo-revealed';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
/** a result taller than the screen counts as seen when it starts this high */
const SEEN_TOP_FRACTION = 0.25;
// the sticky header covers the top of the screen; a result must clear it, with a little air
const HEADER_FALLBACK_PX = 72;
const HEADER_GAP_PX = 16;

function headerClearance(): number {
  const height = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'));
  return (Number.isFinite(height) ? height : HEADER_FALLBACK_PX) + HEADER_GAP_PX;
}

export function revealResult(element: HTMLElement | null): void {
  if (!element) return;
  const box = element.getBoundingClientRect();
  const clearance = headerClearance();
  // wholly on screen below the header, or starting near the top of it
  const visible = box.top >= clearance && box.bottom > 0 && (box.bottom <= window.innerHeight || box.top <= window.innerHeight * SEEN_TOP_FRACTION);
  // jsdom, which the unit tests run on, has neither media queries nor scrolling
  if (!visible && typeof element.scrollIntoView === 'function') {
    const still = typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches;
    // the scroll stops this far below the top, clear of the header
    element.style.scrollMarginTop = `${clearance}px`;
    element.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  }
  // restart the mark when the same result is revealed twice in a row
  element.classList.remove(REVEALED_CLASS);
  void element.offsetWidth;
  element.classList.add(REVEALED_CLASS);
  element.addEventListener('animationend', () => element.classList.remove(REVEALED_CLASS), { once: true });
}

/** how many frames a reveal waits for its element to render before giving up */
const RENDER_FRAMES = 10;

/**
 * Reveal an element the state change just made, once React has rendered it:
 * from the next frame, and on each frame after until it exists. A reveal
 * queued for one frame alone could run before the render and find nothing.
 */
export function revealWhenRendered(get: () => HTMLElement | null, frames = RENDER_FRAMES): void {
  requestAnimationFrame(() => {
    const element = get();
    if (element) revealResult(element);
    else if (frames > 1) revealWhenRendered(get, frames - 1);
  });
}
