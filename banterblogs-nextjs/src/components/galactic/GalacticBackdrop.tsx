'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import dynamic from 'next/dynamic';
import { Pause, Play } from 'lucide-react';
import { SelectionCard } from './SelectionCard';
import { TICKER_INTERVAL_MS, TICKER_START_DELAY_MS } from './TrackingTicker';
import { SystemRail } from './SystemRail';
import { CORE_SELECTION, STAR_SYSTEMS, type GalacticSelection } from './systems';

// Client island for the 3D scene. The scene chunk (three + fiber + drei)
// loads only in capable, motion-permitted, fine-pointer browsers, and only
// once the main thread is idle; everyone else gets the CSS poster. The
// accessible systems nav below renders in ALL modes — it is
// the keyboard/screen-reader/no-WebGL path to the same selection cards the
// canvas drives, and it puts the nine system names AND blurbs in the
// server-rendered HTML (SSR emits the poster branch, so the sr-only spans
// there are what crawlers and text-only agents read).

const GalacticScene = dynamic(() => import('./GalacticScene'), {
  ssr: false,
  loading: () => <Poster />,
});

function Poster() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background: [
          'radial-gradient(ellipse 34% 5% at 58% 53%, hsl(25 92% 58% / 0.72), transparent 72%)',
          'radial-gradient(ellipse 22% 18% at 58% 49%, transparent 50%, hsl(27 95% 72% / 0.28) 55%, transparent 66%)',
          'radial-gradient(circle 112px at 58% 51%, transparent 65px, hsl(31 92% 72% / 0.75) 68px, transparent 72px)',
          'radial-gradient(circle at 58% 51%, #000 65px, transparent 67px)',
          'radial-gradient(ellipse at 52% 25%, hsl(28 35% 10% / 0.45), transparent 55%)',
          '#04060a',
        ].join(', '),
      }}
    />
  );
}

// Scene mode: links reveal on keyboard focus. Poster mode: the same links are
// VISIBLE chips — sighted mouse/touch users without WebGL (or with reduced
// motion) can still select systems, so the "select a system" hint never lies.
const NAV_LINK_SCENE_CLASS =
  'sr-only focus:not-sr-only focus:absolute focus:bottom-24 focus:left-4 focus:z-40 focus:block ' +
  'focus:rounded-lg focus:border focus:border-border/60 focus:bg-background/95 focus:px-4 focus:py-2 ' +
  'focus:text-sm focus:text-foreground focus:shadow-xl';
const NAV_LINK_POSTER_CLASS =
  'inline-block rounded-full border border-border/60 bg-background/80 px-3 py-1.5 font-mono ' +
  'text-[10px] uppercase tracking-[0.08em] text-muted-foreground backdrop-blur transition-colors ' +
  'hover:border-primary/50 hover:text-primary focus-visible:border-primary/50 focus-visible:text-primary';

// Scene gate — any one of these sends the visit to the poster.
// deviceMemory is bucketed (0.25–8 GB); below 4 GB is the low-end phone class
export const MIN_MEMORY_GB = 4;
// fewer cores can't absorb the ~1 s scene-chunk evaluation without input stalls
export const MIN_CORES = 4;
// longest wait for an idle period before the scene chunk loads anyway
const SCENE_IDLE_TIMEOUT_MS = 2000;
// no requestIdleCallback (Safari): let hydration and first paint go first
const SCENE_FALLBACK_DELAY_MS = 500;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const COARSE_POINTER_QUERY = '(pointer: coarse)';
// remembers "Pause motion" across visits; the value is 'paused' or absent
export const MOTION_STORAGE_KEY = 'chimeraforge:landing-motion';

export interface SceneSignals {
  reducedMotion: boolean;
  coarsePointer: boolean;
  deviceMemoryGb?: number;
  logicalCores?: number;
  saveData?: boolean;
  webgl: boolean;
}

// phones and tablets, weak devices, data savers, reduced motion, no WebGL
export function prefersPoster(signals: SceneSignals): boolean {
  return (
    signals.reducedMotion ||
    signals.coarsePointer ||
    (signals.deviceMemoryGb !== undefined && signals.deviceMemoryGb < MIN_MEMORY_GB) ||
    (signals.logicalCores !== undefined && signals.logicalCores < MIN_CORES) ||
    signals.saveData === true ||
    !signals.webgl
  );
}

type NavigatorHints = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

function hasWebGL(): boolean {
  const canvas = document.createElement('canvas');
  const webgl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  // release the probe context — browsers cap live WebGL contexts
  webgl?.getExtension('WEBGL_lose_context')?.loseContext();
  return webgl !== null;
}

function shouldShowPoster(): boolean {
  const nav = navigator as NavigatorHints;
  const cheapSignals: SceneSignals = {
    reducedMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches,
    coarsePointer: window.matchMedia(COARSE_POINTER_QUERY).matches,
    deviceMemoryGb: nav.deviceMemory,
    logicalCores: nav.hardwareConcurrency || undefined,
    saveData: nav.connection?.saveData,
    webgl: true,
  };
  // the WebGL probe creates a context; skip it when a cheap signal decides
  return prefersPoster(cheapSignals) || !hasWebGL();
}

function whenIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: SCENE_IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, SCENE_FALLBACK_DELAY_MS);
  return () => window.clearTimeout(id);
}

function readMotionPaused(): boolean {
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === 'paused';
  } catch (error) {
    console.warn('[landing] stored motion preference unavailable', error);
    return false;
  }
}

function storeMotionPaused(paused: boolean): void {
  try {
    if (paused) window.localStorage.setItem(MOTION_STORAGE_KEY, 'paused');
    else window.localStorage.removeItem(MOTION_STORAGE_KEY);
  } catch (error) {
    console.warn('[landing] could not persist motion preference', error);
  }
}

export function GalacticBackdrop() {
  const [mode, setMode] = useState<'pending' | 'scene' | 'poster'>('pending');
  const [selection, setSelection] = useState<GalacticSelection | null>(null);
  // Tracking-ticker tour: -1 = pre-start (scene gets its cold open first)
  const [featuredIndex, setFeaturedIndex] = useState(-1);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [selectionOpener, setSelectionOpener] = useState<HTMLElement | null>(null);
  const [motionPaused, setMotionPaused] = useState(false);
  // latest-value ref so the interval callback sees pause state without resubscribing
  const tickerPausedRef = useRef(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  // a lost GPU context is not retried for the rest of the visit
  const contextLostRef = useRef(false);

  useEffect(() => {
    // user intent wins: never advance the tour under an open card or a hover
    tickerPausedRef.current = selection !== null || hoveredName !== null;
  }, [selection, hoveredName]);

  const tourStarted = featuredIndex >= 0;
  useEffect(() => {
    if (mode !== 'scene' || tourStarted) return;
    const start = setTimeout(() => setFeaturedIndex(0), TICKER_START_DELAY_MS);
    return () => clearTimeout(start);
  }, [mode, tourStarted]);

  useEffect(() => {
    // "Pause motion" holds the tour on its current system too
    if (mode !== 'scene' || !tourStarted || motionPaused) return;
    const interval = setInterval(() => {
      if (tickerPausedRef.current) return;
      setFeaturedIndex((index) => (index + 1) % STAR_SYSTEMS.length);
    }, TICKER_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [mode, tourStarted, motionPaused]);

  // pointerOver on star B can fire before pointerOut on star A — only the
  // owning star may clear its own hover
  const handleStarHover = (name: string, hovering: boolean) =>
    setHoveredName((prev) => (hovering ? name : prev === name ? null : prev));

  const hoveredSystem = hoveredName
    ? (STAR_SYSTEMS.find((system) => system.name === hoveredName) ?? null)
    : null;
  const featuredSystem = featuredIndex >= 0 ? STAR_SYSTEMS[featuredIndex] : null;
  // hover overrides the tour; an open card silences the readout entirely
  const tickerSystem = selection ? null : (hoveredSystem ?? featuredSystem);

  useEffect(() => {
    // Hydration-safe capability probe: the server can't know motion
    // preference, input type or WebGL support, so the first client pass
    // decides — and decides again when the reduced-motion setting changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMotionPaused(readMotionPaused());
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    let cancelIdle: (() => void) | undefined;
    const decide = () => {
      cancelIdle?.();
      cancelIdle = undefined;
      if (contextLostRef.current || shouldShowPoster()) {
        setMode('poster');
        return;
      }
      cancelIdle = whenIdle(() => {
        cancelIdle = undefined;
        setMode('scene');
      });
    };
    decide();
    reducedMotion.addEventListener('change', decide);
    return () => {
      reducedMotion.removeEventListener('change', decide);
      cancelIdle?.();
    };
  }, []);

  useEffect(() => {
    const container = sceneRef.current;
    if (mode !== 'scene' || !container) return;
    const onContextLost = () => {
      console.warn('[landing] WebGL context lost; showing the poster instead');
      contextLostRef.current = true;
      setMode('poster');
    };
    // dispatched at the canvas without bubbling, so listen in the capture phase
    container.addEventListener('webglcontextlost', onContextLost, true);
    return () => container.removeEventListener('webglcontextlost', onContextLost, true);
  }, [mode]);

  const isPoster = mode !== 'scene';
  const select = (event: MouseEvent<HTMLAnchorElement>, next: GalacticSelection) => {
    // plain click opens the card; modified/middle clicks keep native
    // link behavior so the hrefs stay real for users and crawlers
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    setSelectionOpener(event.currentTarget);
    setSelection(next);
  };
  const selectFromScene = (next: GalacticSelection | null) => {
    setSelectionOpener(null);
    setSelection(next);
  };
  const toggleMotion = () => {
    const next = !motionPaused;
    setMotionPaused(next);
    storeMotionPaused(next);
  };
  const motionLabel = motionPaused ? 'Resume motion' : 'Pause motion';

  return (
    <>
      {mode === 'scene' ? (
        <div ref={sceneRef} className="absolute inset-0 z-0 isolate overflow-hidden" aria-hidden="true">
          <GalacticScene
            onSelect={selectFromScene}
            featuredName={tickerSystem?.name ?? null}
            onStarHover={handleStarHover}
            // an open card covers the scene, so it stops rendering behind it
            paused={motionPaused || selection !== null}
          />
        </div>
      ) : (
        <Poster />
      )}

      {mode === 'scene' && (
        // WCAG 2.2.2: orbits, camera drift and the tour run indefinitely, so
        // they need a stop control; it sits at the end of the bottom chrome row
        <button
          type="button"
          onClick={toggleMotion}
          aria-label={motionLabel}
          title={motionLabel}
          // read by the hero pill's pulse (GalacticHero), which stops on 'paused'
          data-motion={motionPaused ? 'paused' : 'running'}
          className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-5 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/25 text-foreground/80 backdrop-blur-sm transition-colors hover:border-white/25 hover:text-primary sm:right-8"
        >
          {motionPaused ? (
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      )}

      {mode === 'scene' && (
        <div
          className={`transition-opacity ${selection ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          aria-hidden={selection ? true : undefined}
          inert={selection ? true : undefined}
        >
          <SystemRail
            activeSystem={tickerSystem}
            onPreview={handleStarHover}
            onSelect={(system, trigger) => {
              setSelectionOpener(trigger);
              setSelection({ kind: 'star', system });
            }}
          />
        </div>
      )}

      {/* Keyboard / screen-reader / no-WebGL path to the same cards the
          canvas drives — real anchors, so crawlers get the destinations. */}
      {isPoster ? (
        <nav
          aria-label="Systems orbiting the Chimera core"
          className="pointer-events-auto absolute inset-x-4 bottom-20 z-30 sm:inset-x-8"
        >
          <ul className="flex flex-wrap gap-2">
            <li>
              <a
                href={CORE_SELECTION.href}
                className={NAV_LINK_POSTER_CLASS}
                onClick={(event) => select(event, { kind: 'core' })}
              >
                {CORE_SELECTION.name} — {CORE_SELECTION.eyebrow}
                <span className="sr-only">. {CORE_SELECTION.blurb}</span>
              </a>
            </li>
            {STAR_SYSTEMS.map((system) => (
              <li key={system.name}>
                <a
                  href={system.href}
                  className={NAV_LINK_POSTER_CLASS}
                  onClick={(event) => select(event, { kind: 'star', system })}
                >
                  {system.name}
                  <span className="sr-only"> — {system.blurb}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <div className="pointer-events-auto">
          <a
            href={CORE_SELECTION.href}
            className={NAV_LINK_SCENE_CLASS}
            onClick={(event) => select(event, { kind: 'core' })}
          >
            {CORE_SELECTION.name} — {CORE_SELECTION.eyebrow}
            <span className="sr-only">. {CORE_SELECTION.blurb}</span>
          </a>
        </div>
      )}

      {selection && (
        <SelectionCard
          selection={selection}
          onClose={() => setSelection(null)}
          restoreFocusTo={selectionOpener}
        />
      )}
    </>
  );
}
