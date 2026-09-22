import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SCENE_LONG_FRAME_MS,
  SCENE_OPENING_RENDER_MS,
  SCENE_STEADY_MS,
  SCENE_WAKE_MS,
  SCENE_WARMUP_MAX_MS,
  createWarmupGate,
  sceneTimeRate,
} from '../sceneOpening';

// a steady 60 Hz frame
const FRAME_MS = 1000 / 60;
const GLOBALS_CSS = path.join(process.cwd(), 'src', 'app', 'globals.css');
// scene time the canvas may run through while the poster under the
// crossfade is still half visible: two frames of motion at full speed
const MAX_SCENE_TIME_UNDER_POSTER_MS = 2 * FRAME_MS;

// Feeds frame timestamps to a fresh gate; returns the time it first reported warm.
function warmAt(timestamps: number[]): number | null {
  const gate = createWarmupGate();
  for (const now of timestamps) if (gate(now)) return now;
  return null;
}

const steadyFrames = (from: number, until: number) =>
  Array.from({ length: Math.ceil((until - from) / FRAME_MS) + 1 }, (_, i) => from + i * FRAME_MS);

// scene time (ms) that passes over `realMs` of frames after the scene wakes
function sceneTimeAfter(realMs: number): number {
  let sceneMs = 0;
  for (let t = 0; t < realMs; t += 1) sceneMs += sceneTimeRate(t);
  return sceneMs;
}

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

  it('decides while a scene paused at mount is still rendering every frame', () => {
    // a scene paused at mount (stored pause, offscreen canvas) keeps rendering
    // for the opening window, so the gate always sees enough frames
    expect(SCENE_WARMUP_MAX_MS).toBeLessThan(SCENE_OPENING_RENDER_MS);
    expect(SCENE_STEADY_MS).toBeLessThan(SCENE_WARMUP_MAX_MS);
  });
});

// The poster is a still of the scene's opening frame, so the scene holds
// that frame until it wakes (when the crossfade starts), then eases in.
describe('scene wake', () => {
  it('holds scene time until the scene wakes', () => {
    expect(sceneTimeRate(-FRAME_MS)).toBe(0);
    expect(sceneTimeRate(0)).toBe(0);
  });

  it('runs at full speed once the wake has eased in', () => {
    expect(sceneTimeRate(SCENE_WAKE_MS)).toBe(1);
    expect(sceneTimeRate(SCENE_WAKE_MS * 4)).toBe(1);
  });

  it('eases in without ever slowing down', () => {
    let previous = 0;
    for (let t = 0; t <= SCENE_WAKE_MS + FRAME_MS; t += FRAME_MS / 4) {
      const rate = sceneTimeRate(t);
      expect(rate).toBeGreaterThanOrEqual(previous);
      expect(rate).toBeLessThanOrEqual(1);
      previous = rate;
    }
  });

  it('keeps the canvas all but still while the poster under the crossfade shows through', () => {
    const css = fs.readFileSync(GLOBALS_CSS, 'utf8');
    const crossfadeMs = Number(/--duration-scene-crossfade:\s*(\d+)ms;/.exec(css)?.[1]);
    expect(crossfadeMs).toBeGreaterThan(0);
    // the fade is strong-out, so the poster is mostly gone by its midpoint
    expect(sceneTimeAfter(crossfadeMs / 2)).toBeLessThanOrEqual(MAX_SCENE_TIME_UNDER_POSTER_MS);
    // ...and the scene is plainly moving by the time the fade has ended
    expect(sceneTimeRate(crossfadeMs)).toBeGreaterThan(0.5);
  });
});
