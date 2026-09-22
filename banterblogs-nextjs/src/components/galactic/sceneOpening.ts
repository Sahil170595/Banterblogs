// Timing of the scene's opening seconds, shared by the scene (GalacticScene)
// and the tests that pin how its parts relate.

// The scene's clear colour; the poster's backdrop matches it, so a window
// wider than the poster image shows the same black at its sides.
export const SCENE_BACKGROUND = '#04060a';

// A pause that is already on at mount still renders every frame this long,
// so the warm-up gate below sees the frames it needs and the canvas takes
// over from the poster.
export const SCENE_OPENING_RENDER_MS = 2500;

// The poster fades out only once the scene is warm: its first frames compile
// shaders and upload label textures, and on the reference machine a 55-70 ms
// hitch lands 200-330 ms after the first frame. Warm is this long without a
// frame over the long-frame line (the site-wide 50 ms floor)...
export const SCENE_STEADY_MS = 500;
export const SCENE_LONG_FRAME_MS = 50;
// ...or, for a scene that never settles, this long after its first frame.
// Below SCENE_OPENING_RENDER_MS, so a scene paused at mount still renders
// the frames the gate needs.
export const SCENE_WARMUP_MAX_MS = 2000;

// The poster is a still of the scene's opening frame (scene time 0, camera
// at rest), so the scene holds that frame until it wakes, when the crossfade
// starts, then eases scene time in over this long.
export const SCENE_WAKE_MS = 1200;

/**
 * Returns a per-frame check, fed the frame's timestamp (ms), that reports
 * true from the frame on which the scene counts as warm.
 */
export function createWarmupGate(): (now: number) => boolean {
  let first: number | null = null;
  let last = 0;
  let steadySince = 0;
  return (now) => {
    if (first === null) {
      first = now;
      last = now;
      steadySince = now;
      return false;
    }
    if (now - last > SCENE_LONG_FRAME_MS) steadySince = now;
    last = now;
    return now - steadySince >= SCENE_STEADY_MS || now - first >= SCENE_WARMUP_MAX_MS;
  };
}

/**
 * How fast scene time runs (0 to 1), `msSinceWake` after the scene woke.
 * Ease-in cubic: under the strong-out crossfade the canvas barely moves
 * while the poster still shows through, so the two never part.
 */
export function sceneTimeRate(msSinceWake: number): number {
  if (msSinceWake <= 0) return 0;
  return Math.min(msSinceWake / SCENE_WAKE_MS, 1) ** 3;
}
