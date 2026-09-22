// Timing of the scene's opening seconds, shared by the scene (GalacticScene)
// and the tests that pin how its parts relate.

// The disk and halo ignite over ~2 s of rendered frames (uIgnite damp). A
// pause that is already on at mount waits this long, so the scene opens lit
// and renders every frame until then.
export const IGNITION_SETTLE_MS = 2500;

// The poster fades out only once the scene is warm: its first frames compile
// shaders and upload label textures, and on the reference machine a 55-70 ms
// hitch lands 200-330 ms after the first frame. Warm is this long without a
// frame over the long-frame line (the site-wide 50 ms floor)...
export const SCENE_STEADY_MS = 500;
export const SCENE_LONG_FRAME_MS = 50;
// ...or, for a scene that never settles, this long after its first frame.
// Below IGNITION_SETTLE_MS, so a scene paused at mount still renders the
// frames the gate needs.
export const SCENE_WARMUP_MAX_MS = 2000;

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
