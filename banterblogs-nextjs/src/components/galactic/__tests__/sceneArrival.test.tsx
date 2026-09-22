import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GalacticBackdrop, SCENE_CROSSFADE_FALLBACK_MS } from '../GalacticBackdrop';
import { TICKER_INTERVAL_MS, TICKER_START_DELAY_MS } from '../TrackingTicker';
import { STAR_SYSTEMS } from '../systems';

// The scene's arrival (Vercel home's poster -> live canvas crossfade): the
// poster holds until the scene is drawing steadily (sceneOpening.test.ts
// covers when that is), the canvas fades in over it, and the poster leaves
// once the fade has ended. The poster is a still of the scene's opening
// frame, so the scene holds that frame until the crossfade starts. The real
// scene is WebGL; this stand-in keeps the props it was last rendered with.
interface SceneProps {
  paused: boolean;
  awake: boolean;
  onReady: () => void;
}
const lastScene = vi.hoisted(() => ({ props: null as SceneProps | null }));
vi.mock('../GalacticScene', () => ({
  default: (props: SceneProps) => {
    lastScene.props = props;
    return <div data-testid="scene" data-paused={String(props.paused)} data-awake={String(props.awake)} />;
  },
}));

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
const observers = vi.hoisted(
  () => [] as Array<{ callback: ObserverCallback; targets: Element[]; disconnected: boolean }>,
);

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
// covers both the idle-callback deadline and the setTimeout fallback
const SCENE_MAX_WAIT_MS = 2500;
// the crossfade's bounds from the phase R3 spec (B15: 1,200 ms)
const CROSSFADE_MIN_MS = 1100;
const CROSSFADE_MAX_MS = 1300;
// 2% of the scene over the poster moves the disk band by ~4 of 255 levels
const LOADING_OPACITY_MAX = 0.02;
const GLOBALS_CSS = path.join(process.cwd(), 'src', 'app', 'globals.css');

function installMatchMedia() {
  const state: Record<string, boolean> = {};
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

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const poster = () => document.querySelector('[data-scene-poster]');
const layer = () => document.querySelector<HTMLElement>('[data-scene-stage]');
const scene = () => screen.getByTestId('scene');
const sceneReady = () => act(() => lastScene.props?.onReady());
const trackedSystem = () =>
  screen
    .queryAllByRole('link')
    .find((link) => link.getAttribute('aria-current') === 'step')
    ?.getAttribute('aria-label');

describe('landing scene arrival', () => {
  let media: ReturnType<typeof installMatchMedia>;

  beforeEach(() => {
    vi.useFakeTimers();
    media = installMatchMedia();
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({ getExtension: () => ({ loseContext: () => undefined }) }) as unknown as ReturnType<
          HTMLCanvasElement['getContext']
        >,
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        targets: Element[] = [];
        disconnected = false;
        constructor(public callback: ObserverCallback) {
          observers.push(this);
        }
        observe(target: Element) {
          this.targets.push(target);
        }
        disconnect() {
          this.disconnected = true;
        }
      },
    );
    // the pre-paint gate arms motion for visitors who allow it
    document.documentElement.setAttribute('data-motion', 'on');
    localStorage.clear();
    lastScene.props = null;
    observers.length = 0;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('data-motion');
    Reflect.deleteProperty(navigator, 'hardwareConcurrency');
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('server-renders the poster alone, so it is the first paint and the no-JS view', () => {
    const html = renderToStaticMarkup(<GalacticBackdrop />);
    expect(html).toContain('data-scene-poster');
    expect(html).not.toContain('data-scene-stage');
  });

  it('holds the poster over a hidden canvas until the scene is drawing steadily', async () => {
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    expect(screen.getByTestId('scene')).toBeTruthy();
    expect(layer()?.dataset.sceneStage).toBe('loading');
    expect(poster()).not.toBeNull();

    // however long the warm-up takes, nothing gives up on the poster
    await advance(SCENE_CROSSFADE_FALLBACK_MS * 2);
    expect(layer()?.dataset.sceneStage).toBe('loading');
    expect(poster()).not.toBeNull();
  });

  it('holds the scene on the poster frame until the crossfade starts, then wakes it', async () => {
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    expect(scene().dataset.awake).toBe('false');
    await advance(SCENE_CROSSFADE_FALLBACK_MS * 2);
    expect(scene().dataset.awake).toBe('false');

    await sceneReady();
    expect(layer()?.dataset.sceneStage).toBe('fading');
    expect(scene().dataset.awake).toBe('true');

    fireEvent.transitionEnd(layer()!, { propertyName: 'opacity' });
    expect(layer()?.dataset.sceneStage).toBe('live');
    expect(scene().dataset.awake).toBe('true');
  });

  it('fades the canvas in over the poster, which leaves only once the fade has ended', async () => {
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    await sceneReady();
    expect(layer()?.dataset.sceneStage).toBe('fading');
    expect(poster()).not.toBeNull();

    // a transition inside the layer, or on another property, is not the fade
    fireEvent.transitionEnd(screen.getByTestId('scene'), { propertyName: 'opacity' });
    fireEvent.transitionEnd(layer()!, { propertyName: 'transform' });
    expect(poster()).not.toBeNull();

    fireEvent.transitionEnd(layer()!, { propertyName: 'opacity' });
    expect(layer()?.dataset.sceneStage).toBe('live');
    expect(poster()).toBeNull();
  });

  it('retires the poster anyway when the fade never reports its end', async () => {
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    await sceneReady();
    await advance(SCENE_CROSSFADE_FALLBACK_MS);
    expect(layer()?.dataset.sceneStage).toBe('live');
    expect(poster()).toBeNull();
  });

  it('swaps the canvas in at once when motion is not armed', async () => {
    // reduced motion, or a pre-paint gate that never ran: no crossfade
    document.documentElement.removeAttribute('data-motion');
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    expect(scene().dataset.awake).toBe('false');
    await sceneReady();
    expect(layer()?.dataset.sceneStage).toBe('live');
    expect(poster()).toBeNull();
    expect(scene().dataset.awake).toBe('true');
  });

  it('crossfades again when the scene returns after a reduced-motion spell', async () => {
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    await sceneReady();
    await advance(SCENE_CROSSFADE_FALLBACK_MS);
    expect(poster()).toBeNull();

    await act(async () => media.set(REDUCED_MOTION, true));
    expect(screen.queryByTestId('scene')).toBeNull();
    expect(poster()).not.toBeNull();

    await act(async () => media.set(REDUCED_MOTION, false));
    await advance(SCENE_MAX_WAIT_MS);
    expect(layer()?.dataset.sceneStage).toBe('loading');
    expect(poster()).not.toBeNull();
    // a fresh scene opens on the poster frame again
    expect(scene().dataset.awake).toBe('false');
  });

  it('pauses the render loop and the tour while the canvas is offscreen, and resumes on return', async () => {
    render(<GalacticBackdrop />);
    await advance(SCENE_MAX_WAIT_MS);
    await sceneReady();
    await advance(TICKER_START_DELAY_MS);
    expect(trackedSystem()).toBe(`01 — ${STAR_SYSTEMS[0].name}`);

    const observer = observers.find((candidate) => candidate.targets.includes(layer()!));
    expect(observer).toBeDefined();
    act(() => observer!.callback([{ isIntersecting: false }]));
    expect(screen.getByTestId('scene').dataset.paused).toBe('true');
    await advance(TICKER_INTERVAL_MS * 2);
    expect(trackedSystem()).toBe(`01 — ${STAR_SYSTEMS[0].name}`);

    act(() => observer!.callback([{ isIntersecting: true }]));
    expect(screen.getByTestId('scene').dataset.paused).toBe('false');
    await advance(TICKER_INTERVAL_MS);
    expect(trackedSystem()).toBe(`02 — ${STAR_SYSTEMS[1].name}`);

    // the observer goes with the scene
    await act(async () => media.set(REDUCED_MOTION, true));
    expect(observer!.disconnected).toBe(true);
  });
});

describe('landing scene arrival styles', () => {
  const css = fs.readFileSync(GLOBALS_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, declarations]) => ({
    selector: selector.trim(),
    declarations,
  }));

  it('names a 1,100-1,300 ms crossfade token that the poster fallback outlasts', () => {
    const token = /--duration-scene-crossfade:\s*(\d+)ms;/.exec(css);
    expect(token).not.toBeNull();
    const crossfadeMs = Number(token![1]);
    expect(crossfadeMs).toBeGreaterThanOrEqual(CROSSFADE_MIN_MS);
    expect(crossfadeMs).toBeLessThanOrEqual(CROSSFADE_MAX_MS);
    expect(SCENE_CROSSFADE_FALLBACK_MS).toBeGreaterThan(crossfadeMs);
  });

  it('keeps the loading canvas drawn, but too faint to see over the poster', () => {
    // at opacity 0 Chrome drops the canvas from the frame, and its first
    // composite then stalled the page for the whole fade
    const loading = rules.filter((rule) => rule.selector === '[data-scene-stage="loading"]');
    expect(loading).toHaveLength(1);
    expect(loading[0].declarations).toMatch(/opacity:\s*var\(--scene-loading-opacity\);/);
    const floor = Number(/--scene-loading-opacity:\s*([\d.]+);/.exec(css)?.[1]);
    expect(floor).toBeGreaterThan(0);
    expect(floor).toBeLessThanOrEqual(LOADING_OPACITY_MAX);
  });

  it('fades on the token and strong-out, only while motion is armed', () => {
    const fading = rules.filter((rule) => /\[data-scene-stage/.test(rule.selector) && /transition\s*:/.test(rule.declarations));
    expect(fading.length).toBeGreaterThan(0);
    for (const rule of fading) {
      expect(rule.selector).toMatch(/^html\[data-motion="on"\] /);
      expect(rule.declarations).toMatch(/transition:\s*opacity var\(--duration-scene-crossfade\) var\(--ease-strong-out\);/);
    }
  });
});
