import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NAV_RECEDE_RESET_MS, NAV_START_EVENT } from '@/components/motion/navRecede';
import SceneVideo, { RESUME_ATTEMPTS, RESUME_COOLDOWN_MS, videoVariantFor, type SceneVideoVariant } from '../SceneVideo';
import posterManifest from '../scenePoster.manifest.json';
import videoManifest from '../sceneVideo.manifest.json';

// The loop that replaces the poster on touch devices. It never shows a
// frame it has not decoded (the poster stays until the first one is
// presented), and it only plays while someone can see it: not offscreen,
// not in a hidden tab, not while a navigation away renders the next page,
// not after "Pause motion". A refused play() keeps the poster.

const VARIANT: SceneVideoVariant = {
  name: 'phone',
  media: '(max-aspect-ratio: 5/8)',
  aspect: 0.625,
  width: 720,
  height: 1152,
  sources: [
    { src: '/landing/video/phone-720x1152.aaaaaaaa.webm', type: 'video/webm; codecs="av01.0.05M.10"', bytes: 1 },
    { src: '/landing/video/phone-720x1152.bbbbbbbb.mp4', type: 'video/mp4; codecs="avc1.640020"', bytes: 1 },
  ],
};

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;

let play: ReturnType<typeof vi.fn>;
let pause: ReturnType<typeof vi.fn>;
let frameCallbacks: Array<() => void>;
let observers: Array<{ callback: ObserverCallback; targets: Element[] }>;
let visibility: Document['visibilityState'];

const videoElement = () => document.querySelector('video')!;
const layer = () => videoElement().parentElement as HTMLElement;
const shown = () => layer().style.opacity === '1';
const presentFirstFrame = () => act(async () => frameCallbacks.splice(0).forEach((callback) => callback()));
const flush = () => act(async () => undefined);
const setOnscreen = (isIntersecting: boolean) =>
  act(async () => observers.forEach((observer) => observer.callback([{ isIntersecting, target: observer.targets[0] }])));
const setVisibility = (next: Document['visibilityState']) =>
  act(async () => {
    visibility = next;
    document.dispatchEvent(new Event('visibilitychange'));
  });

describe('loop video art direction', () => {
  it('has a loop for the portrait posters and none for the landscape one', () => {
    expect(videoVariantFor('phone')?.width).toBe(1080);
    expect(videoVariantFor('tablet')?.width).toBe(1080);
    // a 12:5 loop would cost a no-GPU desktop 0.4-0.5 of a core in software
    expect(videoVariantFor('landscape')).toBeNull();
  });

  it('frames each loop exactly like the poster it replaces', () => {
    for (const video of videoManifest.variants) {
      const poster = posterManifest.variants.find((variant) => variant.name === video.name);
      expect(poster, `a ${video.name} poster`).toBeDefined();
      expect(video.media).toBe(poster?.media);
      expect(video.aspect).toBe(poster?.aspect);
      expect(video.width / video.height).toBeCloseTo(video.aspect, 2);
    }
  });
});

describe('landing loop video player', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    play = vi.fn(() => Promise.resolve());
    pause = vi.fn();
    frameCallbacks = [];
    observers = [];
    visibility = 'visible';
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { value: play, configurable: true, writable: true });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', { value: pause, configurable: true, writable: true });
    Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', {
      value: (callback: () => void) => frameCallbacks.push(callback),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback', {
      value: () => undefined,
      configurable: true,
      writable: true,
    });
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        targets: Element[] = [];
        constructor(public callback: ObserverCallback) {
          observers.push(this);
        }
        observe(target: Element) {
          this.targets.push(target);
        }
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    for (const name of ['play', 'pause'] as const) Reflect.deleteProperty(HTMLMediaElement.prototype, name);
    for (const name of ['requestVideoFrameCallback', 'cancelVideoFrameCallback'] as const) {
      Reflect.deleteProperty(HTMLVideoElement.prototype, name);
    }
  });

  it('is a muted, inline, looping video that loads nothing until it is played', () => {
    render(<SceneVideo variant={VARIANT} paused />);
    const video = videoElement();
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.getAttribute('preload')).toBe('none');
    // the best codec first; the browser takes the first it can play
    expect([...video.querySelectorAll('source')].map((source) => [source.getAttribute('src'), source.getAttribute('type')])).toEqual(
      VARIANT.sources.map(({ src, type }) => [src, type]),
    );
    expect(layer().getAttribute('aria-hidden')).toBe('true');
    expect(play).not.toHaveBeenCalled();
  });

  it('plays, and shows itself only once its first frame is decoded', async () => {
    render(<SceneVideo variant={VARIANT} paused={false} />);
    await flush();
    expect(play).toHaveBeenCalledTimes(1);
    expect(shown()).toBe(false);

    await presentFirstFrame();
    expect(shown()).toBe(true);
  });

  it('without requestVideoFrameCallback, waits for playback time to advance', async () => {
    Reflect.deleteProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback');
    render(<SceneVideo variant={VARIANT} paused={false} />);
    await flush();
    const video = videoElement();

    await act(async () => void video.dispatchEvent(new Event('playing')));
    expect(shown()).toBe(false);
    Object.defineProperty(video, 'currentTime', { value: 0.04, configurable: true });
    await act(async () => void video.dispatchEvent(new Event('timeupdate')));
    expect(shown()).toBe(true);
  });

  it('keeps the poster and says why when play() is refused', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const refusal = new DOMException('autoplay blocked', 'NotAllowedError');
    play.mockImplementation(() => Promise.reject(refusal));
    const onUnavailable = vi.fn();
    render(<SceneVideo variant={VARIANT} paused={false} onUnavailable={onUnavailable} />);
    await flush();

    expect(warn).toHaveBeenCalledWith('[landing] scene video could not play; keeping the poster', refusal);
    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(shown()).toBe(false);
  });

  it('pauses offscreen and plays again on its return', async () => {
    render(<SceneVideo variant={VARIANT} paused={false} />);
    await flush();
    expect(observers).toHaveLength(1);
    expect(observers[0].targets).toContain(videoElement());
    play.mockClear();

    await setOnscreen(false);
    expect(pause).toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();

    await setOnscreen(true);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('pauses in a hidden tab', async () => {
    render(<SceneVideo variant={VARIANT} paused={false} />);
    await flush();
    play.mockClear();

    await setVisibility('hidden');
    expect(pause).toHaveBeenCalled();
    await setVisibility('visible');
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('stands still while a navigation away renders, and plays again if the page stays', async () => {
    render(<SceneVideo variant={VARIANT} paused={false} />);
    await flush();
    play.mockClear();

    act(() => void window.dispatchEvent(new Event(NAV_START_EVENT)));
    expect(pause).toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(NAV_RECEDE_RESET_MS);
    });
    expect(play).toHaveBeenCalledTimes(1);
  });

  // WebKit stopped the loop at its first wrap (it seeks to 0 and pauses);
  // the loop is meant to run for as long as it can be seen
  it('plays on when the browser pauses it by itself', async () => {
    render(<SceneVideo variant={VARIANT} paused={false} />);
    await flush();
    play.mockClear();

    await act(async () => void videoElement().dispatchEvent(new Event('pause')));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('stops retrying a loop that pauses itself again and again, and says so', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<SceneVideo variant={VARIANT} paused={false} />);
    await flush();
    play.mockClear();

    for (let attempt = 0; attempt < RESUME_ATTEMPTS + 3; attempt++) {
      await act(async () => void videoElement().dispatchEvent(new Event('pause')));
    }
    expect(play).toHaveBeenCalledTimes(RESUME_ATTEMPTS);
    expect(warn).toHaveBeenCalledWith('[landing] scene video keeps pausing itself; leaving it on its last frame');

    // a loop that ran for a while before pausing gets the retries back
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RESUME_COOLDOWN_MS + 1);
      videoElement().dispatchEvent(new Event('pause'));
    });
    expect(play).toHaveBeenCalledTimes(RESUME_ATTEMPTS + 1);
  });

  it('pauses and resumes with the motion control', async () => {
    const { rerender } = render(<SceneVideo variant={VARIANT} paused={false} />);
    await flush();
    play.mockClear();

    rerender(<SceneVideo variant={VARIANT} paused />);
    await flush();
    expect(pause).toHaveBeenCalled();
    rerender(<SceneVideo variant={VARIANT} paused={false} />);
    await flush();
    expect(play).toHaveBeenCalledTimes(1);
  });
});
