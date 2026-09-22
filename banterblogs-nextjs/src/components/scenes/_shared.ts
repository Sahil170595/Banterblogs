// Shared scene primitives. Kept deliberately tiny — the fuller extraction of
// beat timers and reduced-motion bridges lives in the shared-scene-primitives
// refactor (PR #14); this module only hosts logic that was byte-identical
// across all 5 scenes so a pacing fix lands once.

import { useSyncExternalStore } from 'react';

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
