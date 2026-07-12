'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import dynamic from 'next/dynamic';
import { SelectionCard } from './SelectionCard';
import { CORE_SELECTION, STAR_SYSTEMS, type GalacticSelection } from './systems';

// Client island for the 3D scene. The scene chunk (three + fiber + drei)
// loads only in capable, motion-permitted browsers; everyone else gets the
// CSS poster. The accessible systems nav below renders in ALL modes — it is
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

  const isPoster = mode !== 'scene';
  const select = (event: MouseEvent<HTMLAnchorElement>, next: GalacticSelection) => {
    // plain click opens the card; modified/middle clicks keep native
    // link behavior so the hrefs stay real for users and crawlers
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    setSelection(next);
  };

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
          canvas drives — real anchors, so crawlers get the destinations. */}
      <nav
        aria-label="Systems orbiting the Chimera core"
        className={
          isPoster
            ? 'pointer-events-auto absolute inset-x-4 bottom-20 z-30 sm:inset-x-8'
            : 'pointer-events-auto'
        }
      >
        <ul className={isPoster ? 'flex flex-wrap gap-2' : undefined}>
          <li className={isPoster ? undefined : 'contents'}>
            <a
              href={CORE_SELECTION.href}
              className={isPoster ? NAV_LINK_POSTER_CLASS : NAV_LINK_SCENE_CLASS}
              onClick={(e) => select(e, { kind: 'core' })}
            >
              {CORE_SELECTION.name} — {CORE_SELECTION.eyebrow}
              {/* always sr-only: keeps the scene focus chip compact while the
                  blurb stays in SSR text for crawlers and screen readers */}
              <span className="sr-only">. {CORE_SELECTION.blurb}</span>
            </a>
          </li>
          {STAR_SYSTEMS.map((system) => (
            <li key={system.name} className={isPoster ? undefined : 'contents'}>
              <a
                href={system.href}
                className={isPoster ? NAV_LINK_POSTER_CLASS : NAV_LINK_SCENE_CLASS}
                onClick={(e) => select(e, { kind: 'star', system })}
              >
                {system.name}
                {/* poster chips show the bare name; the blurb rides along
                    sr-only so it is in the SSR HTML. Scene mode renders it
                    plain — visible in the focus-reveal chip, as before. */}
                <span className={isPoster ? 'sr-only' : undefined}> — {system.blurb}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {selection && <SelectionCard selection={selection} onClose={() => setSelection(null)} />}
    </>
  );
}
