// The /platform ecosystem map's stylesheet (EcosystemMap.tsx), as text.
// EcosystemMap serves it inline, as a <style> React hoists into <head>: as an
// imported stylesheet it was a second render-blocking sheet on /platform
// (e2e/routes.spec.ts). Nothing compiles it, so it is plain CSS (no nesting,
// no prefixing), and nothing scopes it, so every class, keyframes and
// container name carries the emap- prefix. compactCss strips its comments.
// The entrance keys on the reveal state by the motion primitive's own
// selectors, so the state's names live in one place.

import { REVEAL_HELD, REVEAL_UNHELD } from '@/components/motion/revealObserver';

/** the map's rules, as reviewed; EcosystemMap serves them compacted */
export const MAP_STYLESHEET = `
/* On the FlowFigure's plate (.flow, globals.css). Three hand-laid drawings
   of one graph: the phone one by default, then the tablet one and the wide
   one, each once the figure itself is as wide as the drawing, so none is
   shown shrunk; each is capped at about 1.1x so it never outgrows the
   page's own text. Nodes are hairline pills; the core is the figure's one
   ember mark. A solid line is a live service call, a dotted one data with
   no call, a dashed one something not running. Tracing a node (MapTrace)
   lights its edges and neighbours in ember and dims the rest. */

.emap-map {
  container-type: inline-size;
  container-name: emap-map;
  margin-top: 1.5rem;
}

.emap-drawing {
  display: block;
  width: 100%;
  height: auto;
  margin-inline: auto;
  overflow: visible;
}

/* 310 units: unscaled on a 390px phone, at most 22rem (1.14x) on a wider one */
.emap-narrow {
  max-width: 22rem;
}

/* 580 units, up to 40rem (1.1x) */
.emap-medium {
  display: none;
  max-width: 40rem;
}

/* 820 units, up to 56rem (1.09x) */
.emap-wide {
  display: none;
  max-width: 56rem;
}

/* each from the width it is drawn at: 580 and 820 units */
@container emap-map (min-width: 36.25rem) {
  .emap-medium {
    display: block;
  }

  .emap-narrow {
    display: none;
  }
}

@container emap-map (min-width: 51.25rem) {
  .emap-wide {
    display: block;
  }

  .emap-medium {
    display: none;
  }
}

/* nodes */
.emap-node {
  cursor: pointer;
  transition: opacity var(--duration-hover) var(--ease-standard);
}

/* the site ring (globals.css) outlines an SVG link's square bounding box,
   round a rounded pill; .emap-ring draws it on the pill's own shape instead */
:root a.emap-node:focus-visible {
  outline: none;
  box-shadow: none;
}

.emap-ring {
  fill: none;
  stroke: none;
}

.emap-pill {
  fill: hsl(var(--card));
  stroke: hsl(var(--foreground) / 0.2);
  stroke-width: 1;
  transition:
    stroke var(--duration-fast) var(--ease-standard),
    fill var(--duration-fast) var(--ease-standard);
}

.emap-name {
  fill: hsl(var(--foreground));
  font-size: 14px;
  font-weight: 560;
  letter-spacing: -0.005em;
}

.emap-narrow .emap-name {
  font-size: 13px;
}

.emap-stack {
  fill: hsl(var(--muted-foreground));
  font-size: 12px;
}

.emap-node[data-core] .emap-pill {
  fill: hsl(var(--primary) / 0.1);
  stroke: hsl(var(--primary) / 0.75);
}

.emap-node:hover .emap-pill {
  stroke: hsl(var(--primary) / 0.8);
}

.emap-node[data-lit] .emap-pill {
  stroke: hsl(var(--primary) / 0.8);
}

/* as the site ring: 2px of ember, 2px off the pill */
.emap-node:focus-visible .emap-ring {
  stroke: hsl(var(--primary));
  stroke-width: 2;
}

/* edges */
.emap-edge {
  transition: opacity var(--duration-hover) var(--ease-standard);
}

.emap-line {
  fill: none;
  stroke: hsl(var(--foreground) / 0.5);
  stroke-width: 1.25;
  stroke-linecap: round;
  transition: stroke var(--duration-fast) var(--ease-standard);
}

.emap-edge[data-line="data"] .emap-line {
  stroke-dasharray: 0.1 5;
  stroke-width: 1.75;
}

.emap-edge[data-line="inactive"] .emap-line {
  stroke: hsl(var(--foreground) / 0.38);
  stroke-dasharray: 5 4;
  stroke-linecap: butt;
}

.emap-head {
  fill: hsl(var(--foreground) / 0.55);
  transition: fill var(--duration-fast) var(--ease-standard);
}

.emap-edge[data-line="inactive"] .emap-head {
  fill: hsl(var(--foreground) / 0.4);
}

.emap-label {
  fill: hsl(var(--muted-foreground));
  font-size: 12px;
  transition: fill var(--duration-fast) var(--ease-standard);
}

/* a dotted or dashed line is drawn in through this: the same path, solid */
.emap-wipe {
  fill: none;
  stroke: #fff;
  stroke-width: 8;
}

/* traced: what touches the chosen node stays, the rest steps back */
.emap-map[data-active] :is(.emap-node, .emap-edge):not([data-lit]) {
  opacity: 0.3;
}

.emap-edge[data-lit] .emap-line {
  stroke: hsl(var(--primary));
}

.emap-edge[data-lit] .emap-head {
  fill: hsl(var(--primary));
}

.emap-edge[data-lit] .emap-label {
  fill: hsl(var(--foreground));
}

/* The entrance: each edge draws from its caller to what it calls, once,
   when the figure is revealed (or at load, if it is already on screen), one
   --stagger-item apart; its arrowhead and label follow. At rest there is no
   dash on a solid line, so nothing depends on the animation having run. */
@keyframes emap-draw-in {
  from {
    stroke-dasharray: 1 1;
    stroke-dashoffset: 1;
  }

  to {
    stroke-dasharray: 1 1;
    stroke-dashoffset: 0;
  }
}

@keyframes emap-arrive-in {
  from {
    opacity: 0;
  }
}

html[data-motion="on"] ${REVEAL_UNHELD} .emap-draw {
  animation: emap-draw-in var(--duration-reveal) var(--ease-strong-out) calc(var(--stagger-group) + var(--edge-i, 0) * var(--stagger-item)) backwards;
}

html[data-motion="on"] ${REVEAL_UNHELD} .emap-arrive {
  animation: emap-arrive-in var(--duration-enter) var(--ease-strong-out) calc(var(--stagger-group) + var(--edge-i, 0) * var(--stagger-item) + var(--duration-enter)) backwards;
}

html[data-motion="on"] ${REVEAL_HELD} .emap-draw {
  stroke-dasharray: 1 1;
  stroke-dashoffset: 1;
}

html[data-motion="on"] ${REVEAL_HELD} .emap-arrive {
  opacity: 0;
}

/* under the drawing */
.emap-readout {
  /* two lines held, so a longer role does not move the key beneath it */
  min-height: 2.5rem;
  margin-top: 1rem;
}

.emap-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 1.5rem;
  margin-top: 0.75rem;
}

.emap-legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
}

.emap-sample {
  flex: none;
  width: 1.75rem;
  height: 0.5rem;
  overflow: visible;
}

.emap-connections {
  display: grid;
  gap: 0.625rem;
  max-width: 70ch;
  margin-top: 0.75rem;
}
`;
