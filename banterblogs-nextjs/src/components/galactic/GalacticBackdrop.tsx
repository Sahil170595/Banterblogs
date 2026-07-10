'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Client island for the 3D scene. The scene chunk (three + fiber + drei)
// loads only in capable, motion-permitted browsers; everyone else gets the
// CSS poster, which shares the scene's composition so the visual language
// survives without WebGL.

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
          // photon ring + disk glow, right-of-center like the live scene
          'radial-gradient(ellipse 42% 10% at 62% 52%, hsl(16 95% 53% / 0.55), transparent 60%)',
          'radial-gradient(circle 90px at 62% 50%, transparent 54px, hsl(28 90% 62% / 0.5) 58px, transparent 66px)',
          'radial-gradient(circle at 62% 50%, #000 52px, transparent 54px)',
          'radial-gradient(ellipse at 30% 20%, hsl(220 30% 8%), transparent 70%)',
          '#04060a',
        ].join(', '),
      }}
    />
  );
}

export function GalacticBackdrop() {
  const [mode, setMode] = useState<'pending' | 'scene' | 'poster'>('pending');

  useEffect(() => {
    // Hydration-safe capability probe: the server can't know motion
    // preference or WebGL support, so the first client pass must decide.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = document.createElement('canvas');
    const webgl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(reducedMotion || !webgl ? 'poster' : 'scene');
  }, []);

  if (mode !== 'scene') return <Poster />;

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <GalacticScene />
    </div>
  );
}
