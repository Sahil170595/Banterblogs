// Runs work once the page has shown its first content and the main thread is
// idle. A PSI run whose first paint stalls (to ~2.3 s) is charged for every
// request issued before that paint, so warm-up prefetches wait for it.

const FIRST_CONTENTFUL_PAINT = 'first-contentful-paint';
// longest wait for an idle period once the page has painted
const PAINT_IDLE_TIMEOUT_MS = 2000;
// no requestIdleCallback (Safari): let the paint's own work finish first
const IDLE_FALLBACK_DELAY_MS = 200;

function hasPainted(): boolean {
  if (typeof performance.getEntriesByType !== 'function') return false;
  return performance.getEntriesByType('paint').some((entry) => entry.name === FIRST_CONTENTFUL_PAINT);
}

function onFirstPaint(callback: () => void): () => void {
  if (hasPainted()) {
    callback();
    return () => undefined;
  }
  const paintTiming = typeof PerformanceObserver !== 'undefined' && (PerformanceObserver.supportedEntryTypes ?? []).includes('paint');
  if (!paintTiming) {
    // no paint timing to wait on: the load event stands in for the paint
    if (document.readyState === 'complete') {
      callback();
      return () => undefined;
    }
    window.addEventListener('load', callback, { once: true });
    return () => window.removeEventListener('load', callback);
  }
  const observer = new PerformanceObserver((list) => {
    if (!list.getEntries().some((entry) => entry.name === FIRST_CONTENTFUL_PAINT)) return;
    observer.disconnect();
    callback();
  });
  observer.observe({ type: 'paint', buffered: true });
  return () => observer.disconnect();
}

function whenIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: PAINT_IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, IDLE_FALLBACK_DELAY_MS);
  return () => window.clearTimeout(id);
}

/** Calls back once the page has painted its first content and gone idle; returns the cancel. */
export function afterFirstPaint(callback: () => void): () => void {
  let cancelIdle: (() => void) | undefined;
  const cancelPaint = onFirstPaint(() => {
    cancelIdle = whenIdle(callback);
  });
  return () => {
    cancelPaint();
    cancelIdle?.();
  };
}
