import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GalacticBackdrop,
  MIN_CORES,
  MIN_MEMORY_GB,
  MOTION_STORAGE_KEY,
  prefersPoster,
  type SceneSignals,
} from '../GalacticBackdrop';
import { NAV_RECEDE_ATTRIBUTE, NAV_RECEDE_RESET_MS, NAV_START_EVENT } from '@/components/motion/navRecede';
import { SCENE_CONTEXT_ATTRIBUTES } from '../sceneOpening';
import { TICKER_INTERVAL_MS, TICKER_START_DELAY_MS } from '../TrackingTicker';
import { STAR_SYSTEMS } from '../systems';

// The real scene is WebGL; this stand-in exposes the pause flag it receives.
vi.mock('../GalacticScene', () => ({
  default: ({ paused }: { paused: boolean }) => <div data-testid="scene" data-paused={String(paused)} />,
}));

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const COARSE_POINTER = '(pointer: coarse)';
// covers both the idle-callback deadline and the setTimeout fallback
const SCENE_MAX_WAIT_MS = 2500;

const CAPABLE: SceneSignals = {
  reducedMotion: false,
  coarsePointer: false,
  deviceMemoryGb: 8,
  logicalCores: 8,
  saveData: false,
  webgl: true,
};

describe('landing scene gate', () => {
  it('loads the scene only on a capable, fine-pointer, motion-permitted device', () => {
    expect(prefersPoster(CAPABLE)).toBe(false);
    // browsers that expose none of the hints (Safari, Firefox) are not penalised
    expect(
      prefersPoster({ ...CAPABLE, deviceMemoryGb: undefined, logicalCores: undefined, saveData: undefined }),
    ).toBe(false);
  });

  it.each([
    ['reduced motion', { reducedMotion: true }],
    ['a coarse (touch) pointer', { coarsePointer: true }],
    ['low device memory', { deviceMemoryGb: MIN_MEMORY_GB / 2 }],
    ['few CPU cores', { logicalCores: MIN_CORES - 2 }],
    ['data saver', { saveData: true }],
    ['no WebGL', { webgl: false }],
  ] as const)('shows the poster for %s', (_reason, override) => {
    expect(prefersPoster({ ...CAPABLE, ...override })).toBe(true);
  });
});

function installMatchMedia(initial: Record<string, boolean>) {
  const state: Record<string, boolean> = { ...initial };
  const listeners = new Set<() => void>();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return state[query] ?? false;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    set(query: string, matches: boolean) {
      state[query] = matches;
      listeners.forEach((listener) => listener());
    },
  };
}

// One act() per phase: React flushes the updates (and the effects that arm
// the next timer) only when an act scope ends.
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const trackedSystem = () =>
  screen
    .queryAllByRole('link')
    .find((link) => link.getAttribute('aria-current') === 'step')
    ?.getAttribute('aria-label');

const scene = () => screen.queryByTestId('scene');

describe('landing scene lifecycle and motion control', () => {
  let media: ReturnType<typeof installMatchMedia>;

  beforeEach(() => {
    vi.useFakeTimers();
    media = installMatchMedia({ [REDUCED_MOTION]: false, [COARSE_POINTER]: false });
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({ getExtension: () => ({ loseContext: () => undefined }) }) as unknown as ReturnType<
          HTMLCanvasElement['getContext']
        >,
    );
    localStorage.clear();
  });

  afterEach(() => {
    // unmount while the stubbed globals still exist
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'hardwareConcurrency');
    Reflect.deleteProperty(window, 'matchMedia');
    Reflect.deleteProperty(window, 'requestIdleCallback');
    Reflect.deleteProperty(window, 'cancelIdleCallback');
  });

  it('waits for an idle period before loading the scene', async () => {
    let idle: (() => void) | undefined;
    const requestIdle = vi.fn((callback: () => void) => {
      idle = callback;
      return 1;
    });
    Object.assign(window, { requestIdleCallback: requestIdle, cancelIdleCallback: vi.fn() });

    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    expect(scene()).toBeNull();
    expect(requestIdle).toHaveBeenCalledWith(expect.any(Function), { timeout: expect.any(Number) });

    await act(async () => idle?.());
    expect(scene()).not.toBeNull();
  });

  it('keeps touch devices on the poster, with nothing to pause', async () => {
    media.set(COARSE_POINTER, true);
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);

    expect(scene()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pause motion' })).toBeNull();
  });

  it('keeps software WebGL (SwiftShader, no GPU) on the poster', async () => {
    // a software renderer grants a plain context but refuses a strict one
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((_type: string, attributes?: { failIfMajorPerformanceCaveat?: boolean }) =>
        attributes?.failIfMajorPerformanceCaveat
          ? null
          : ({ getExtension: () => ({ loseContext: () => undefined }) } as unknown as ReturnType<
              HTMLCanvasElement['getContext']
            >),
      );
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);

    expect(scene()).toBeNull();
    expect(getContext).toHaveBeenCalledWith(expect.stringMatching(/^webgl2?$/), SCENE_CONTEXT_ATTRIBUTES);
    expect(screen.queryByRole('button', { name: 'Pause motion' })).toBeNull();
  });

  it('pauses the render loop and the tour, and remembers the choice', async () => {
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    expect(scene()?.dataset.paused).toBe('false');

    await advance(TICKER_START_DELAY_MS);
    await advance(TICKER_INTERVAL_MS);
    expect(trackedSystem()).toBe(`02 — ${STAR_SYSTEMS[1].name}`);

    fireEvent.click(screen.getByRole('button', { name: 'Pause motion' }));
    expect(scene()?.dataset.paused).toBe('true');
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('paused');
    await advance(TICKER_INTERVAL_MS * 3);
    expect(trackedSystem()).toBe(`02 — ${STAR_SYSTEMS[1].name}`);

    fireEvent.click(screen.getByRole('button', { name: 'Resume motion' }));
    expect(scene()?.dataset.paused).toBe('false');
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull();
    await advance(TICKER_INTERVAL_MS);
    expect(trackedSystem()).toBe(`03 — ${STAR_SYSTEMS[2].name}`);
  });

  it('starts paused when the visitor paused on an earlier visit', async () => {
    localStorage.setItem(MOTION_STORAGE_KEY, 'paused');
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    await advance(TICKER_START_DELAY_MS);
    await advance(TICKER_INTERVAL_MS * 2);

    expect(scene()?.dataset.paused).toBe('true');
    expect(screen.getByRole('button', { name: 'Resume motion' })).toBeTruthy();
    // the cold open still resolves to the first system; the tour holds there
    expect(trackedSystem()).toBe(`01 — ${STAR_SYSTEMS[0].name}`);
  });

  it('still toggles when storage is unavailable, and says so', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);

    fireEvent.click(screen.getByRole('button', { name: 'Pause motion' }));
    expect(scene()?.dataset.paused).toBe('true');
    expect(warn).toHaveBeenCalledWith('[landing] could not persist motion preference', expect.any(DOMException));
  });

  it('pauses the render loop while a selection card is open', async () => {
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);

    fireEvent.click(screen.getByRole('link', { name: `01 — ${STAR_SYSTEMS[0].name}` }));
    expect(scene()?.dataset.paused).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(scene()?.dataset.paused).toBe('false');
  });

  // Phase R5 (design re-judge P1-C): the landing answered its main click
  // 140-297 ms late while the scene kept rendering. A navigation away recedes
  // the rail and the pause control and holds the tour (the scene holds its
  // own frame: navigationHold.test.tsx), all without a React render, which
  // would lengthen the click's task; one that never replaces the page gives
  // them back.
  it('recedes the rail and holds the tour while a navigation away renders, without rendering', async () => {
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    await advance(TICKER_START_DELAY_MS);
    const rail = screen.getByRole('navigation', { name: 'Systems orbiting the Chimera core' });
    const pause = screen.getByRole('button', { name: 'Pause motion' });
    // the next tour step falls inside the navigation
    await advance(TICKER_INTERVAL_MS - NAV_RECEDE_RESET_MS / 2);
    const before = trackedSystem();

    act(() => {
      window.dispatchEvent(new Event(NAV_START_EVENT));
    });
    expect(rail.closest(`[${NAV_RECEDE_ATTRIBUTE}]`)).not.toBeNull();
    expect(pause.hasAttribute(NAV_RECEDE_ATTRIBUTE)).toBe(true);
    // the scene's props are untouched: no render reaches the canvas
    expect(scene()?.dataset.paused).toBe('false');
    await advance(NAV_RECEDE_RESET_MS * 0.75);
    expect(trackedSystem()).toBe(before);

    await advance(NAV_RECEDE_RESET_MS);
    expect(rail.closest(`[${NAV_RECEDE_ATTRIBUTE}]`)).toBeNull();
    expect(pause.hasAttribute(NAV_RECEDE_ATTRIBUTE)).toBe(false);
  });

  it('falls back to the poster when reduced motion turns on', async () => {
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    expect(scene()).not.toBeNull();

    await act(async () => media.set(REDUCED_MOTION, true));
    expect(scene()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pause motion' })).toBeNull();
  });

  it('falls back to the poster for good when the WebGL context is lost', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);

    await act(async () => {
      scene()?.dispatchEvent(new Event('webglcontextlost'));
    });
    expect(scene()).toBeNull();
    expect(warn).toHaveBeenCalledWith('[landing] WebGL context lost; showing the poster instead');

    // a later reduced-motion flip must not bring the dead scene back
    await act(async () => media.set(REDUCED_MOTION, false));
    await advance(SCENE_MAX_WAIT_MS);
    expect(scene()).toBeNull();
  });
});
