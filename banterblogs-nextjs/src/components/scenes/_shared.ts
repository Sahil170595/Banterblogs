// Shared scene primitives. Kept deliberately tiny — the fuller extraction of
// beat timers and reduced-motion bridges lives in the shared-scene-primitives
// refactor (PR #14); this module only hosts logic that was byte-identical
// across all 5 scenes so a pacing fix lands once.

/**
 * Beat dwell time derived from copy length: 13 characters/second reading rate
 * (research-grounded: BBC subtitles run ~15 CPS, Netflix 17-20 for lighter
 * dialogue), +350ms to register the line, clamped to a 1.5s floor and 7s cap.
 */
export function computeDwell(copy: string): number {
  return Math.min(7000, Math.max(1500, Math.round((copy.length / 13) * 1000 + 350)));
}
