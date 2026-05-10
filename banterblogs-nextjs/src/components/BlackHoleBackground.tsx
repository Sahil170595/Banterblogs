'use client';

import dynamic from 'next/dynamic';

// Server-rendered placeholder is a static SVG that approximates the
// black hole. Visible during initial paint and when WebGL isn't available
// or the user prefers reduced motion. The interactive canvas mounts on top
// once the lazy chunk loads.
//
// The canvas is dynamic+ssr:false so OGL (WebGL library) ships in its own
// chunk and only fetches on the homepage after first paint.

const BlackHoleCanvas = dynamic(
  () => import('./BlackHoleCanvas').then((m) => m.BlackHoleCanvas),
  { ssr: false, loading: () => null },
);

export function BlackHoleBackground() {
  return (
    <div className="black-hole-stage" aria-hidden>
      {/* Static fallback — visible briefly before the canvas chunk loads
          and as the permanent rendering for prefers-reduced-motion / no-WebGL. */}
      <svg
        className="black-hole-fallback"
        viewBox="0 0 800 800"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="bh-disk" cx="50%" cy="50%" r="50%">
            <stop offset="14%" stopColor="hsl(220 32% 2%)" stopOpacity="1" />
            <stop offset="16%" stopColor="hsl(16 95% 53%)" stopOpacity="0.85" />
            <stop offset="20%" stopColor="hsl(16 95% 53%)" stopOpacity="0.45" />
            <stop offset="34%" stopColor="hsl(14 88% 45%)" stopOpacity="0.18" />
            <stop offset="60%" stopColor="hsl(14 88% 45%)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="800" fill="url(#bh-disk)" />
        <circle cx="400" cy="400" r="112" fill="hsl(220 32% 2%)" />
      </svg>
      <BlackHoleCanvas className="black-hole-canvas" />
      <style>{`
        .black-hole-stage {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(95vmin, 1100px);
          height: min(95vmin, 1100px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.95;
          /* Feather edges so the rectangular bounding box never shows. */
          mask-image: radial-gradient(circle at center, black 45%, transparent 88%);
          -webkit-mask-image: radial-gradient(circle at center, black 45%, transparent 88%);
        }
        .black-hole-fallback,
        .black-hole-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}
