'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { SelectionCard } from './SelectionCard';
import { CORE_SELECTION, STAR_SYSTEMS, type GalacticSelection } from './systems';

// Client island for the 3D scene. The scene chunk (three + fiber + drei)
// loads only in capable, motion-permitted browsers; everyone else gets the
// CSS poster. The accessible systems nav below renders in ALL modes — it is
// the keyboard/screen-reader/no-WebGL path to the same selection cards the
// canvas drives, and it puts the nine system names in the server-rendered
// HTML for crawlers.

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

const NAV_BUTTON_CLASS =
  'sr-only focus:not-sr-only focus:absolute focus:bottom-24 focus:left-4 focus:z-40 focus:block ' +
  'focus:rounded-lg focus:border focus:border-border/60 focus:bg-background/95 focus:px-4 focus:py-2 ' +
  'focus:text-sm focus:text-foreground focus:shadow-xl';

export function GalacticBackdrop() {
  const [mode, setMode] = useState<'pending' | 'scene' | 'poster'>('pending');
  const [selection, setSelection] = useState<GalacticSelection | null>(null);

  useEffect(() => {
    // Hydration-safe capability probe: the server can't know motion
    // preference or WebGL support, so the first client pass must decide.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = document.createElement('canvas');
    const webgl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    // release the probe context — browsers cap live WebGL contexts
    webgl?.getExtension('WEBGL_lose_context')?.loseContext();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(reducedMotion || !webgl ? 'poster' : 'scene');
  }, []);

  return (
    <>
      {mode === 'scene' ? (
        <div className="absolute inset-0 z-0 isolate overflow-hidden" aria-hidden="true">
          <GalacticScene onSelect={setSelection} />
        </div>
      ) : (
        <Poster />
      )}

      {/* Keyboard / screen-reader / no-WebGL path to the same cards the
          canvas drives. Buttons reveal on focus for sighted keyboard users. */}
      <nav aria-label="Systems orbiting the Chimera core" className="pointer-events-auto">
        <ul>
          <li>
            <button className={NAV_BUTTON_CLASS} onClick={() => setSelection({ kind: 'core' })}>
              {CORE_SELECTION.name} — {CORE_SELECTION.eyebrow}
            </button>
          </li>
          {STAR_SYSTEMS.map((system) => (
            <li key={system.name}>
              <button
                className={NAV_BUTTON_CLASS}
                onClick={() => setSelection({ kind: 'star', system })}
              >
                {system.name} — {system.blurb}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {selection && <SelectionCard selection={selection} onClose={() => setSelection(null)} />}
    </>
  );
}
