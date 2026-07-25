import { describe, expect, it } from 'vitest';
import {
  CAMERA_OPENING,
  CAMERA_SETTLED,
  CAMERA_TARGET_DESKTOP,
  CAMERA_TARGET_MOBILE,
  CINEMATIC_REVEAL_SECONDS,
  cameraBaseAt,
  cameraTargetForViewport,
  cinematicRevealProgress,
} from '../sceneChoreography';

describe('galactic scene choreography', () => {
  it('starts tight on the event horizon and resolves to the full atlas camera', () => {
    expect(cameraBaseAt(0)).toEqual(CAMERA_OPENING);
    expect(cameraBaseAt(CINEMATIC_REVEAL_SECONDS)).toEqual(CAMERA_SETTLED);
    expect(cameraBaseAt(CINEMATIC_REVEAL_SECONDS * 4)).toEqual(CAMERA_SETTLED);
  });

  it('uses a clamped eased reveal rather than a linear dolly', () => {
    expect(cinematicRevealProgress(-1)).toBe(0);
    expect(cinematicRevealProgress(CINEMATIC_REVEAL_SECONDS + 1)).toBe(1);
    expect(cinematicRevealProgress(CINEMATIC_REVEAL_SECONDS / 2)).toBeGreaterThan(0.5);
  });

  it('never moves the camera through the physical disk volume', () => {
    for (let step = 0; step <= 20; step += 1) {
      const camera = cameraBaseAt((CINEMATIC_REVEAL_SECONDS * step) / 20);
      expect(camera[2]).toBeGreaterThan(15);
      expect(camera[1]).toBeGreaterThan(0);
    }
  });

  it('composes the core right on desktop and below the copy on mobile', () => {
    expect(cameraTargetForViewport(1440)).toEqual(CAMERA_TARGET_DESKTOP);
    expect(cameraTargetForViewport(390)).toEqual(CAMERA_TARGET_MOBILE);
  });
});
