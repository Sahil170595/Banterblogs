import { describe, expect, it } from 'vitest';
import {
  IGNITION_SETTLE_MS,
  SCENE_LONG_FRAME_MS,
  SCENE_STEADY_MS,
  SCENE_WARMUP_MAX_MS,
  createWarmupGate,
} from '../sceneOpening';

// a steady 60 Hz frame
const FRAME_MS = 1000 / 60;

// Feeds frame timestamps to a fresh gate; returns the time it first reported warm.
function warmAt(timestamps: number[]): number | null {
  const gate = createWarmupGate();
  for (const now of timestamps) if (gate(now)) return now;
  return null;
}

const steadyFrames = (from: number, until: number) =>
  Array.from({ length: Math.ceil((until - from) / FRAME_MS) + 1 }, (_, i) => from + i * FRAME_MS);

describe('scene warm-up gate', () => {
  it('is not warm on the first frame, however it arrives', () => {
    expect(createWarmupGate()(0)).toBe(false);
  });

  it('is warm once the scene has rendered steadily for the steady window', () => {
    const warm = warmAt(steadyFrames(0, SCENE_STEADY_MS * 2));
    expect(warm).not.toBeNull();
    expect(warm!).toBeGreaterThanOrEqual(SCENE_STEADY_MS);
    expect(warm!).toBeLessThan(SCENE_STEADY_MS + FRAME_MS);
  });

  it('starts the steady window over after a frame longer than the long-frame line', () => {
    const hitchAt = SCENE_STEADY_MS / 2;
    const frames = [...steadyFrames(0, hitchAt), ...steadyFrames(hitchAt + SCENE_LONG_FRAME_MS + 1, SCENE_STEADY_MS * 3)];
    const warm = warmAt(frames);
    expect(warm!).toBeGreaterThanOrEqual(hitchAt + SCENE_LONG_FRAME_MS + 1 + SCENE_STEADY_MS);
  });

  it('counts a scene that never settles as warm once the warm-up cap has passed', () => {
    const jank = Array.from({ length: 100 }, (_, i) => i * (SCENE_LONG_FRAME_MS + 10));
    const warm = warmAt(jank);
    expect(warm).not.toBeNull();
    expect(warm!).toBeGreaterThanOrEqual(SCENE_WARMUP_MAX_MS);
    expect(warm!).toBeLessThan(SCENE_WARMUP_MAX_MS + SCENE_LONG_FRAME_MS + 10);
  });

  it('decides before the ignition settles, while frames are still guaranteed', () => {
    // a scene paused at mount (stored pause, offscreen canvas) keeps rendering
    // until the ignition settles, so the gate always sees enough frames
    expect(SCENE_WARMUP_MAX_MS).toBeLessThan(IGNITION_SETTLE_MS);
    expect(SCENE_STEADY_MS).toBeLessThan(SCENE_WARMUP_MAX_MS);
  });
});
