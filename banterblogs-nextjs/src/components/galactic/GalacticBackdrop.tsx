'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import dynamic from 'next/dynamic';
import { SelectionCard } from './SelectionCard';
import { TICKER_INTERVAL_MS, TICKER_START_DELAY_MS } from './TrackingTicker';
import { SystemRail } from './SystemRail';
import { CORE_SELECTION, STAR_SYSTEMS, type GalacticSelection } from './systems';

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
          'radial-gradient(circle at 60% 51%, #000 65px, transparent 67px)',
          'radial-gradient(circle 112px at 60% 51%, transparent 65px, hsl(31 92% 72% / 0.78) 68px, transparent 72px)',
          'radial-gradient(ellipse 38% 5% at 60% 54%, hsl(24 94% 55% / 0.78), transparent 72%)',
          'radial-gradient(ellipse 23% 19% at 60% 50%, transparent 50%, hsl(29 96% 72% / 0.3) 55%, transparent 66%)',
          'radial-gradient(ellipse at 54% 28%, hsl(28 35% 10% / 0.48), transparent 55%)',
          '#020305',
        ].join(', '),
      }}
    />
  );
}

const NAV_LINK_SCENE_CLASS =
  'sr-only focus:not-sr-only focus:pointer-events-auto focus:absolute focus:bottom-32 focus:left-[var(--landing-gutter)] ' +
  'focus:z-40 focus:block focus:border focus:border-border/60 focus:bg-background/95 focus:px-4 focus:py-3 ' +
  'focus:text-sm focus:text-foreground focus:shadow-xl';
export function GalacticBackdrop() {
  const [mode, setMode] = useState<'pending' | 'scene' | 'poster'>('pending');
  const [sceneReady, setSceneReady] = useState(false);
  const [selection, setSelection] = useState<GalacticSelection | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(-1);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const tickerPausedRef = useRef(false);

  useEffect(() => {
    tickerPausedRef.current = selection !== null || hoveredName !== null;
  }, [selection, hoveredName]);

  useEffect(() => {
    if (mode !== 'scene') return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setFeaturedIndex(0);
      interval = setInterval(() => {
        if (tickerPausedRef.current) return;
        setFeaturedIndex((index) => (index + 1) % STAR_SYSTEMS.length);
      }, TICKER_INTERVAL_MS);
    }, TICKER_START_DELAY_MS);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [mode]);

  const handleStarHover = (name: string, hovering: boolean) =>
    setHoveredName((previous) => (hovering ? name : previous === name ? null : previous));

  const hoveredSystem = hoveredName
    ? (STAR_SYSTEMS.find((system) => system.name === hoveredName) ?? null)
    : null;
  const featuredSystem = featuredIndex >= 0 ? STAR_SYSTEMS[featuredIndex] : null;
  const tickerSystem = selection ? null : (hoveredSystem ?? featuredSystem);
  const selectedSystem = selection?.kind === 'star' ? selection.system : null;
  const railSystem = selectedSystem ?? tickerSystem;

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const chooseMode = () => {
      const canvas = document.createElement('canvas');
      const webgl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      webgl?.getExtension('WEBGL_lose_context')?.loseContext();
      setSceneReady(false);
      setMode(motionQuery.matches || !webgl ? 'poster' : 'scene');
    };
    chooseMode();
    motionQuery.addEventListener('change', chooseMode);
    return () => motionQuery.removeEventListener('change', chooseMode);
  }, []);

  const select = (event: MouseEvent<HTMLAnchorElement>, next: GalacticSelection) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    setSelection(next);
  };

  return (
    <>
      <Poster />
      {mode === 'scene' && (
        <div
          className={`absolute inset-0 z-0 isolate overflow-hidden transition-opacity duration-700 ${
            sceneReady ? 'opacity-100' : 'opacity-0'
          } ${selection ? 'pointer-events-none' : ''}`}
          aria-hidden="true"
        >
          <GalacticScene
            onSelect={setSelection}
            featuredName={railSystem?.name ?? null}
            onStarHover={handleStarHover}
            onReady={() => setSceneReady(true)}
            onUnavailable={() => {
              setSceneReady(false);
              setMode('poster');
            }}
          />
        </div>
      )}

      <div
        className={`pointer-events-none absolute inset-0 z-30 transition-opacity ${
          selection ? 'opacity-0' : 'opacity-100'
        }`}
        inert={selection ? true : undefined}
        aria-hidden={selection ? true : undefined}
      >
        <a
          href={CORE_SELECTION.href}
          className={NAV_LINK_SCENE_CLASS}
          onClick={(event) => select(event, { kind: 'core' })}
        >
          {CORE_SELECTION.name} — {CORE_SELECTION.eyebrow}. {CORE_SELECTION.blurb}
        </a>
        <SystemRail
          activeSystem={railSystem ?? (mode === 'poster' ? STAR_SYSTEMS[0] : null)}
          onPreview={handleStarHover}
          onSelect={(system) => setSelection({ kind: 'star', system })}
        />
      </div>

      {selection && (
        <>
          <button
            type="button"
            aria-label="Dismiss details overlay"
            className="pointer-events-auto absolute inset-0 z-[35] cursor-default bg-black/20 backdrop-blur-[1px]"
            onClick={() => setSelection(null)}
          />
          <SelectionCard selection={selection} onClose={() => setSelection(null)} />
        </>
      )}
    </>
  );
}
