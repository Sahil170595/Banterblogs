export type CameraTuple = readonly [x: number, y: number, z: number];

// The cold open begins outside the accretion disk (R_outer = 15), tight
// enough that the shadow dominates, then cranes back to reveal the atlas.
export const CAMERA_OPENING: CameraTuple = [2.2, 4.4, 18.5];
export const CAMERA_SETTLED: CameraTuple = [0, 6, 28.5];
export const SYSTEM_ORIGIN: CameraTuple = [3, 0, 0];
export const CAMERA_TARGET_DESKTOP: CameraTuple = [0, 0.15, 0];
export const CAMERA_TARGET_MOBILE: CameraTuple = [3, 2.55, 0];
export const CINEMATIC_REVEAL_SECONDS = 4.6;
export const OPENING_FOV_DEGREES = 38;
export const SETTLED_FOV_DEGREES = 42;
const MOBILE_COMPOSITION_BREAKPOINT_PX = 768;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** A fast initial reveal with a long, controlled settle. */
export function cinematicRevealProgress(elapsedSeconds: number): number {
  const linear = clamp01(elapsedSeconds / CINEMATIC_REVEAL_SECONDS);
  return 1 - Math.pow(1 - linear, 4);
}

export function cameraBaseAt(elapsedSeconds: number): CameraTuple {
  const progress = cinematicRevealProgress(elapsedSeconds);
  if (progress === 0) return CAMERA_OPENING;
  if (progress === 1) return CAMERA_SETTLED;

  return [
    CAMERA_OPENING[0] + (CAMERA_SETTLED[0] - CAMERA_OPENING[0]) * progress,
    CAMERA_OPENING[1] + (CAMERA_SETTLED[1] - CAMERA_OPENING[1]) * progress,
    CAMERA_OPENING[2] + (CAMERA_SETTLED[2] - CAMERA_OPENING[2]) * progress,
  ];
}

export function cameraFovAt(elapsedSeconds: number): number {
  const progress = cinematicRevealProgress(elapsedSeconds);
  return OPENING_FOV_DEGREES + (SETTLED_FOV_DEGREES - OPENING_FOV_DEGREES) * progress;
}

export function cameraTargetForViewport(viewportWidthPx: number): CameraTuple {
  return viewportWidthPx < MOBILE_COMPOSITION_BREAKPOINT_PX
    ? CAMERA_TARGET_MOBILE
    : CAMERA_TARGET_DESKTOP;
}
