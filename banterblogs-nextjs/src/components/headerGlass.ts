import { ENTRANCE_ATTRIBUTE } from './motion/prePaint';

// The interior header's glass (.site-header::before, globals.css) blurs what
// scrolls under it. Chrome compiles the blur's shader programs the first time
// the layer is drawn, a GPU-thread stall on a cold shader cache, and at
// opacity 0 the layer is never drawn: the stall used to land on the first
// scrolled frame. Warmed, the glass rests at HEADER_GLASS_FLOOR instead of 0,
// so the compile runs once the page has settled and nothing is moving.

export const GLASS_ATTRIBUTE = 'data-glass';
export const GLASS_WARM = 'warm';
/** the warmed glass's resting opacity (--header-glass-floor): drawn, but too faint to see */
export const HEADER_GLASS_FLOOR = 0.01;

/**
 * Warms the header's glass once the page has settled: after the load event,
 * and after the first-load entrance window closes, so the compile never
 * stalls the entrance. Returns the cleanup for unmount.
 */
export function warmHeaderGlass(header: HTMLElement): () => void {
  const root = document.documentElement;
  let observer: MutationObserver | undefined;
  const warm = () => header.setAttribute(GLASS_ATTRIBUTE, GLASS_WARM);
  const afterEntrance = () => {
    if (!root.hasAttribute(ENTRANCE_ATTRIBUTE)) return warm();
    observer = new MutationObserver(() => {
      if (root.hasAttribute(ENTRANCE_ATTRIBUTE)) return;
      observer?.disconnect();
      warm();
    });
    observer.observe(root, { attributes: true, attributeFilter: [ENTRANCE_ATTRIBUTE] });
  };
  if (document.readyState === 'complete') afterEntrance();
  else window.addEventListener('load', afterEntrance, { once: true });
  return () => {
    window.removeEventListener('load', afterEntrance);
    observer?.disconnect();
  };
}
