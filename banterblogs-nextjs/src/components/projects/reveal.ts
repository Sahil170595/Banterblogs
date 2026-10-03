// A choice made in a demo's table often changes a result further down the
// page. revealResult brings that result into view when it is off screen and
// marks it for a moment (.demo-revealed in reading.css), so the visitor sees
// what their click did.

export const REVEALED_CLASS = 'demo-revealed';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function revealResult(element: HTMLElement | null): void {
  if (!element) return;
  const box = element.getBoundingClientRect();
  const visible = box.top >= 0 && box.top < window.innerHeight && box.bottom > 0;
  if (!visible) {
    const still = window.matchMedia(REDUCED_MOTION).matches;
    element.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  }
  // restart the mark when the same result is revealed twice in a row
  element.classList.remove(REVEALED_CLASS);
  void element.offsetWidth;
  element.classList.add(REVEALED_CLASS);
  element.addEventListener('animationend', () => element.classList.remove(REVEALED_CLASS), { once: true });
}
