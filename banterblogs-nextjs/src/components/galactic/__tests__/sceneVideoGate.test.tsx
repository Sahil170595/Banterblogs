import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GalacticBackdrop, MOTION_STORAGE_KEY } from '../GalacticBackdrop';
import { allowsVideo, videoVariantFor, SCENE_VIDEO_VARIANTS, type VideoSignals } from '../sceneVideoGate';
import posterManifest from '../scenePoster.manifest.json';

// Phones and tablets never run the WebGL scene; they get a short loop
// rendered from it (scripts/render-scene-video.mjs) in place of the still
// poster, but only once the page has loaded and gone idle, and never for
// visitors who asked for less motion or less data. The player is covered
// by sceneVideoPlayer.test.tsx; this stand-in shows what it was given.

vi.mock('../SceneVideo', () => ({
  default: ({ variant, paused }: { variant: { name: string }; paused: boolean }) => (
    <div data-testid="video" data-variant={variant.name} data-paused={String(paused)} />
  ),
}));
vi.mock('../GalacticScene', () => ({ default: () => <div data-testid="scene" /> }));

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const COARSE_POINTER = '(pointer: coarse)';
const PHONE_ASPECT = '(max-aspect-ratio: 5/8)';
const TABLET_ASPECT = '(max-aspect-ratio: 4/5)';
// covers both the idle-callback deadline and the setTimeout fallback
const IDLE_MAX_WAIT_MS = 2500;

const TOUCH: VideoSignals = {
  reducedMotion: false,
  coarsePointer: true,
  saveData: false,
  effectiveType: '4g',
  hidden: false,
};

describe('landing loop video gate', () => {
  it('plays the loop on a visible, motion-permitted touch device', () => {
    expect(allowsVideo(TOUCH)).toBe(true);
    // browsers without the Network Information API (Safari, Firefox) are not penalised
    expect(allowsVideo({ ...TOUCH, saveData: undefined, effectiveType: undefined })).toBe(true);
  });

  it.each([
    ['reduced motion', { reducedMotion: true }],
    ['Save-Data', { saveData: true }],
    ['a slow-2g connection', { effectiveType: 'slow-2g' }],
    ['a 2g connection', { effectiveType: '2g' }],
    ['a hidden page', { hidden: true }],
  ] as const)('keeps the still poster for %s', (_reason, override) => {
    expect(allowsVideo({ ...TOUCH, ...override })).toBe(false);
  });

  it('keeps fine-pointer visits on the poster (no GPU, weak devices) on the still', () => {
    expect(allowsVideo({ ...TOUCH, coarsePointer: false })).toBe(false);
  });
});

describe('loop video art direction', () => {
  const matching = (...queries: string[]) => (media: string) => queries.includes(media);

  it('serves the loop of the poster variant the viewport shows', () => {
    expect(videoVariantFor(matching(PHONE_ASPECT, TABLET_ASPECT))?.name).toBe('phone');
    expect(videoVariantFor(matching(TABLET_ASPECT))?.name).toBe('tablet');
    // wider viewports show the landscape poster, which has no loop
    expect(videoVariantFor(matching())).toBeNull();
  });

  it('frames each loop exactly like the poster it replaces', () => {
    for (const video of SCENE_VIDEO_VARIANTS) {
      const poster = posterManifest.variants.find((variant) => variant.name === video.name);
      expect(poster, `a ${video.name} poster`).toBeDefined();
      expect(video.media).toBe(poster?.media);
      expect(video.aspect).toBe(poster?.aspect);
      expect(video.width / video.height).toBeCloseTo(video.aspect, 2);
    }
  });
});

function installMatchMedia(initial: Record<string, boolean>) {
  const state: Record<string, boolean> = { ...initial };
  const listeners = new Map<string, Set<() => void>>();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return state[query] ?? false;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)?.add(listener);
    },
    removeEventListener: (_type: string, listener: () => void) => listeners.get(query)?.delete(listener),
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    set(query: string, matches: boolean) {
      state[query] = matches;
      listeners.get(query)?.forEach((listener) => listener());
    },
  };
}

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const video = () => screen.queryByTestId('video');
const pauseButton = () => screen.queryByRole('button', { name: /(Pause|Resume) motion/ });

describe('landing loop video lifecycle', () => {
  let media: ReturnType<typeof installMatchMedia>;
  let idle: Array<() => void>;
  let readyState: Document['readyState'];
  let visibility: Document['visibilityState'];

  const setConnection = (connection: { saveData?: boolean; effectiveType?: string } | undefined) =>
    Object.defineProperty(navigator, 'connection', { value: connection, configurable: true });
  const goIdle = () => act(async () => idle.splice(0).forEach((callback) => callback()));
  const finishLoading = () =>
    act(async () => {
      readyState = 'complete';
      window.dispatchEvent(new Event('load'));
    });

  beforeEach(() => {
    vi.useFakeTimers();
    media = installMatchMedia({ [COARSE_POINTER]: true, [PHONE_ASPECT]: true, [TABLET_ASPECT]: true });
    idle = [];
    Object.assign(window, {
      requestIdleCallback: vi.fn((callback: () => void) => idle.push(callback)),
      cancelIdleCallback: vi.fn(),
    });
    readyState = 'complete';
    visibility = 'visible';
    vi.spyOn(document, 'readyState', 'get').mockImplementation(() => readyState);
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    setConnection({ saveData: false, effectiveType: '4g' });
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'connection');
    Reflect.deleteProperty(window, 'matchMedia');
    Reflect.deleteProperty(window, 'requestIdleCallback');
    Reflect.deleteProperty(window, 'cancelIdleCallback');
  });

  it('mounts the loop only after the load event and an idle period', async () => {
    readyState = 'interactive';
    render(<GalacticBackdrop />);
    await advance(IDLE_MAX_WAIT_MS);
    await goIdle();
    expect(video()).toBeNull();

    await finishLoading();
    expect(video()).toBeNull();
    await goIdle();
    expect(video()?.dataset.variant).toBe('phone');
    // the scene itself never loads on a touch device
    expect(screen.queryByTestId('scene')).toBeNull();
  });

  it.each([
    ['reduced motion', () => media.set(REDUCED_MOTION, true)],
    ['Save-Data', () => setConnection({ saveData: true, effectiveType: '4g' })],
    ['a 2g connection', () => setConnection({ saveData: false, effectiveType: '2g' })],
  ])('never mounts the loop under %s, and offers nothing to pause', async (_reason, apply) => {
    apply();
    render(<GalacticBackdrop />);
    await goIdle();
    await advance(IDLE_MAX_WAIT_MS);
    await goIdle();

    expect(video()).toBeNull();
    expect(pauseButton()).toBeNull();
    expect(document.querySelector('[data-scene-poster]')).not.toBeNull();
  });

  it('waits for a hidden page to be shown', async () => {
    visibility = 'hidden';
    render(<GalacticBackdrop />);
    await goIdle();
    expect(video()).toBeNull();

    await act(async () => {
      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await goIdle();
    expect(video()).not.toBeNull();
  });

  it('takes the loop down when reduced motion turns on', async () => {
    render(<GalacticBackdrop />);
    await goIdle();
    expect(video()).not.toBeNull();

    await act(async () => media.set(REDUCED_MOTION, true));
    expect(video()).toBeNull();
    expect(pauseButton()).toBeNull();
  });

  it('frames the loop like the poster as the viewport turns', async () => {
    render(<GalacticBackdrop />);
    await goIdle();
    expect(video()?.dataset.variant).toBe('phone');

    await act(async () => media.set(PHONE_ASPECT, false));
    expect(video()?.dataset.variant).toBe('tablet');
    // landscape shows the landscape poster, which has no loop
    await act(async () => media.set(TABLET_ASPECT, false));
    expect(video()).toBeNull();
    expect(pauseButton()).toBeNull();
  });

  // WCAG 2.2.2: the loop runs indefinitely, so it needs a stop control
  it('gives the loop a pause control that it remembers', async () => {
    render(<GalacticBackdrop />);
    await goIdle();
    expect(video()?.dataset.paused).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Pause motion' }));
    expect(video()?.dataset.paused).toBe('true');
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('paused');

    fireEvent.click(screen.getByRole('button', { name: 'Resume motion' }));
    expect(video()?.dataset.paused).toBe('false');
  });

  it('starts paused when the visitor paused on an earlier visit', async () => {
    localStorage.setItem(MOTION_STORAGE_KEY, 'paused');
    render(<GalacticBackdrop />);
    await goIdle();

    expect(video()?.dataset.paused).toBe('true');
    expect(screen.getByRole('button', { name: 'Resume motion' })).toBeTruthy();
  });
});
