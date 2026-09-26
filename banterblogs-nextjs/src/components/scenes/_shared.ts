// Shared scene primitives. Kept deliberately tiny — the fuller extraction of
// beat timers and reduced-motion bridges lives in the shared-scene-primitives
// refactor (PR #14); this module only hosts logic that was byte-identical
// across all 5 scenes so a pacing fix lands once.

import { useSyncExternalStore, type CSSProperties } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const canQuery = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

function subscribeToMotionPreference(onChange: () => void): () => void {
  if (!canQuery()) return () => undefined;
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * The motion preference, hydration-safe. framer's useReducedMotion is null on
 * the server and the real value on the client's first render, so reading it
 * straight makes the two renders differ (React #418). This is `true` (motion
 * off) on the server and through hydration, then the visitor's preference;
 * a client-side render reads the preference at once.
 */
export function useSceneReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => canQuery() && window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => true,
  );
}

/**
 * Beat dwell time derived from copy length: 13 characters/second reading rate
 * (research-grounded: BBC subtitles run ~15 CPS, Netflix 17-20 for lighter
 * dialogue), +350ms to register the line, clamped to a 1.5s floor and 7s cap.
 */
export function computeDwell(copy: string): number {
  return Math.min(7000, Math.max(1500, Math.round((copy.length / 13) * 1000 + 350)));
}

/**
 * Pins a narration panel on wide screens so the line and the visual it
 * describes share the screen. Just under the sticky site header and its z-50.
 * Opaque: the panel's own signal-panel-strong surface is card/95 and unlayered,
 * so a bg utility on the panel cannot win; this wrapper is the ground instead.
 * Its solid shadow fills the 0.75rem gap under the header, so the visual
 * scrolling beneath does not show between the two.
 * The wrapper's parent is the narrated section, so it unpins where that ends.
 */
export const STICKY_NARRATION =
  'lg:sticky lg:top-[calc(var(--site-header-height)+0.75rem)] lg:z-30 lg:rounded-3xl lg:bg-background lg:shadow-[0_-0.75rem_0_0.75rem_hsl(var(--background))]';

/**
 * For a focusable control in a narrated section, below the pinned panel: when
 * focus scrolls it into view, it lands clear of the panel (~15rem tall at
 * most, pinned 0.75rem under the header) rather than beneath it.
 */
export const CLEAR_OF_STICKY_NARRATION = 'lg:scroll-mt-[15rem]';

// Beat bars: one row on lg, balanced rows below it, never a lone bar on a row
// of its own. Each bar fills its column and stays a 24px target (WCAG 2.5.8):
// a band holds at most floor(width / 24) columns of the narrowest box a beat
// row gets in it.
const BEAT_TARGET_PX = 24;
const BEAT_ROW_MIN_PX = {
  // a 320px phone: 320 - 2 × 16 gutter - 2 × 20 panel padding
  narrow: 248,
  // md, BFT and Provenance: 768 - 48 gutter - 220 timeline - 24 gap - 56 padding
  mid: 420,
  // lg, the same two-column layout: 1024 - 64 gutter - 244 - 56
  wide: 660,
} as const;

/** Columns for n bars in a box `widthPx` wide: as few rows as fit, evenly filled. */
function balancedColumns(n: number, widthPx: number): number {
  const most = Math.max(1, Math.floor(widthPx / BEAT_TARGET_PX));
  return Math.ceil(n / Math.ceil(n / most));
}

/** The beat row's column count per band, as the vars BEAT_BAR_GRID reads. */
export function beatBarColumns(n: number): CSSProperties {
  const count = Math.max(1, n);
  return {
    '--beat-cols-narrow': balancedColumns(count, BEAT_ROW_MIN_PX.narrow),
    '--beat-cols-mid': balancedColumns(count, BEAT_ROW_MIN_PX.mid),
    '--beat-cols-wide': balancedColumns(count, BEAT_ROW_MIN_PX.wide),
  } as CSSProperties;
}

export const BEAT_BAR_GRID =
  'grid gap-x-0.5 grid-cols-[repeat(var(--beat-cols-narrow),minmax(0,1fr))] sm:grid-cols-[repeat(var(--beat-cols-mid),minmax(0,1fr))] lg:grid-cols-[repeat(var(--beat-cols-wide),minmax(0,1fr))]';

// The element every scene renders inside: the scene sheet
// (src/app/show/scenes.css) scopes its utilities to it, and display:
// contents keeps it out of the page's layout.
export const SCENE_ROOT = { 'data-scene': '', style: { display: 'contents' } } as const;
