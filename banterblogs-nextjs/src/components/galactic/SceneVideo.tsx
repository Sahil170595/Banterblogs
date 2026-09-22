'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NAV_RECEDE_RESET_MS, NAV_START_EVENT } from '@/components/motion/navRecede';
import { SCENE_VIDEO_TIMING, type SceneVideoSource, type SceneVideoVariant } from './sceneVideoGate';

// The loop over the poster (sceneVideoGate.ts decides who gets it). It stays
// transparent until its first frame is presented, which is the poster's own
// frame, then fades in over the poster, which stays underneath. It plays
// only while it can be seen and motion is on.

// hides the codecs' differences from the poster's AVIF; the pictures match
export const VIDEO_CROSSFADE_MS = 400;
// the poster <img> ScenePoster renders; its chosen file is already in cache
const POSTER_IMAGE_SELECTOR = '[data-scene-poster] img';
const BITS_PER_BYTE = 8;

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

interface SceneVideoProps {
  variant: SceneVideoVariant;
  /** "Pause motion" */
  paused: boolean;
  /** the loop cannot play on this device; the poster stays */
  onUnavailable?: () => void;
}

/**
 * The variant's sources with those this device decodes in hardware first,
 * each group in the manifest's order: AV1 is the smaller file, but a phone
 * without an AV1 decoder would run it on the CPU for as long as it loops.
 */
async function orderByDecodeCost(variant: SceneVideoVariant): Promise<SceneVideoSource[]> {
  const capabilities = navigator.mediaCapabilities;
  const seconds = SCENE_VIDEO_TIMING.frames / SCENE_VIDEO_TIMING.fps;
  const results = await Promise.all(
    variant.sources.map((source) =>
      capabilities
        .decodingInfo({
          type: 'file',
          video: {
            contentType: source.type,
            width: variant.width,
            height: variant.height,
            bitrate: Math.round((source.bytes * BITS_PER_BYTE) / seconds),
            framerate: SCENE_VIDEO_TIMING.fps,
          },
        })
        .catch((error: unknown) => {
          console.warn('[landing] could not query how this device decodes the scene video', source.type, error);
          return null;
        }),
    ),
  );
  const efficient = variant.sources.filter((_, index) => results[index]?.supported && results[index]?.powerEfficient);
  return [...efficient, ...variant.sources.filter((source) => !efficient.includes(source))];
}

export default function SceneVideo({ variant, paused, onUnavailable }: SceneVideoProps) {
  const videoRef = useRef<FrameCallbackVideo>(null);
  // without MediaCapabilities the manifest's order stands, at once
  const [sources, setSources] = useState<SceneVideoSource[] | null>(() =>
    typeof navigator.mediaCapabilities?.decodingInfo === 'function' ? null : variant.sources,
  );
  const [posterSrc, setPosterSrc] = useState<string | undefined>(undefined);
  const [shown, setShown] = useState(false);
  // read by event handlers without a render: a navigation's click task stays short
  const conditions = useRef({ ready: false, paused, onscreen: true, hidden: false, leaving: false, failed: false });
  const playRequested = useRef(false);
  const onUnavailableRef = useRef(onUnavailable);
  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  const sync = useCallback(() => {
    const video = videoRef.current;
    const state = conditions.current;
    if (!video || !state.ready || state.failed) return;
    const shouldPlay = !state.paused && state.onscreen && !state.hidden && !state.leaving;
    if (shouldPlay === playRequested.current) return;
    playRequested.current = shouldPlay;
    if (!shouldPlay) {
      video.pause();
      return;
    }
    video.muted = true;
    video.play()?.catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // a pause (offscreen, hidden, leaving) overtook this play(); nothing failed
        console.debug('[landing] scene video play() interrupted by a pause', error);
        return;
      }
      console.warn('[landing] scene video could not play; keeping the poster', error);
      conditions.current.failed = true;
      onUnavailableRef.current?.();
    });
  }, []);

  useEffect(() => {
    if (sources !== null) return;
    let cancelled = false;
    orderByDecodeCost(variant).then((ordered) => {
      if (!cancelled) setSources(ordered);
    });
    return () => {
      cancelled = true;
    };
  }, [sources, variant]);

  useEffect(() => {
    // the <source> children are in the DOM once `sources` is set
    conditions.current.ready = sources !== null;
    conditions.current.paused = paused;
    sync();
  }, [paused, sources, sync]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const poster = document.querySelector<HTMLImageElement>(POSTER_IMAGE_SELECTOR);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the poster's chosen file exists only after mount
    if (poster?.currentSrc) setPosterSrc(poster.currentSrc);

    // the first presented frame, not 'playing', which can come before any frame
    let frameHandle: number | undefined;
    const onTimeUpdate = () => {
      if (video.currentTime > 0) setShown(true);
    };
    if (typeof video.requestVideoFrameCallback === 'function') {
      frameHandle = video.requestVideoFrameCallback(() => setShown(true));
    } else {
      video.addEventListener('timeupdate', onTimeUpdate);
    }

    const onVisibility = () => {
      conditions.current.hidden = document.visibilityState === 'hidden';
      sync();
    };
    conditions.current.hidden = document.visibilityState === 'hidden';
    document.addEventListener('visibilitychange', onVisibility);

    let resume: ReturnType<typeof setTimeout> | undefined;
    const onLeave = () => {
      // the decoder and compositor go to the next page; one that never
      // replaces this page gives them back
      conditions.current.leaving = true;
      sync();
      clearTimeout(resume);
      resume = setTimeout(() => {
        conditions.current.leaving = false;
        sync();
      }, NAV_RECEDE_RESET_MS);
    };
    window.addEventListener(NAV_START_EVENT, onLeave);

    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => {
        conditions.current.onscreen = entry.isIntersecting;
        sync();
      });
      observer.observe(video);
    }

    return () => {
      if (frameHandle !== undefined) video.cancelVideoFrameCallback?.(frameHandle);
      video.removeEventListener('timeupdate', onTimeUpdate);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener(NAV_START_EVENT, onLeave);
      clearTimeout(resume);
      observer?.disconnect();
      video.pause();
    };
  }, [sync]);

  return (
    <div
      aria-hidden="true"
      data-scene-video={variant.name}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        opacity: shown ? 1 : 0,
        transition: `opacity ${VIDEO_CROSSFADE_MS}ms var(--ease-strong-out)`,
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        autoPlay={false}
        preload="none"
        poster={posterSrc}
        width={variant.width}
        height={variant.height}
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        className="absolute left-1/2 top-0 h-full w-auto max-w-none -translate-x-1/2 select-none"
      >
        {sources?.map((source) => <source key={source.src} src={source.src} type={source.type} />)}
      </video>
    </div>
  );
}
