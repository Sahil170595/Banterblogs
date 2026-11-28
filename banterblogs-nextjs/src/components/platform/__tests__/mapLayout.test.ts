import { describe, expect, it } from 'vitest';
import { ECOSYSTEM_NODES, nodeById, type NodeId } from '@/lib/ecosystem';
import { ECOSYSTEM_EDGES, edgeKey } from '../connections';
import { MAP_LAYOUTS, arrowHead, labelLines, pillBox, pointAt, routePath, type MapLayout, type Route } from '../mapLayout';
import { MAP_STYLESHEET } from '../mapStylesheet';
import { textWidth } from './manropeAdvances';

// The map is laid out by hand, three times: across for a wide figure, in
// rows for a tablet-width one, down for a phone. These checks are its ruler,
// with text measured from Manrope's real advances: every node and edge is
// placed in each, an edge starts and ends on the border of its own two nodes
// and keeps clear of every other, a node's text fits its pill, and a label
// sits by its own line, clear of the rest.

const CSS = MAP_STYLESHEET.replace(/\/\*[\s\S]*?\*\//g, '');
/** a font size the stylesheet sets, in px */
function cssPx(selector: string): number {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = CSS.match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{[^}]*font-size:\\s*([\\d.]+)px`));
  if (!match) throw new Error(`no font-size for ${selector} in mapStylesheet.ts`);
  return Number(match[1]);
}
const LABEL_PX = cssPx('.emap-label');
const STACK_PX = cssPx('.emap-stack');
const namePx = (layout: MapLayout) => (CSS.includes(`.emap-${layout.id} .emap-name`) ? cssPx(`.emap-${layout.id} .emap-name`) : cssPx('.emap-name'));
const LABEL_LINE_PX = 14;
/** a 12px line's ink, from its baseline: capitals and ascenders above, descenders below */
const ASCENT_PX = 10;
const DESCENT_PX = 3;

/** clear space kept around a node */
const NODE_MARGIN = 6;
/** a node's text, clear of its pill's border on each side */
const PILL_SIDE = 12;
/** a label keeps this clear of every line, its own included... */
const LABEL_LINE_GAP = 4;
/** ...and stays this near its own, so it reads as that line's */
const LABEL_LINE_REACH = 12;
/** a label keeps this clear of a line that is not its own */
const LABEL_OTHER_LINE_GAP = 8;
/** a label keeps this clear of every node and every other label */
const LABEL_GAP = 6;
/** an edge passes no node but its own two nearer than this */
const EDGE_NODE_GAP = 8;
/** how near the border counts as on it */
const ON_BORDER = 0.75;
/** points along a route: dense enough that consecutive ones are under 2 units apart */
const CURVE_SAMPLES = 400;

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const grow = (box: Box, by: number): Box => ({ x0: box.x0 - by, y0: box.y0 - by, x1: box.x1 + by, y1: box.y1 + by });
const inside = (box: Box, [x, y]: readonly [number, number]) => x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1;
const distance = (box: Box, [x, y]: readonly [number, number]) => Math.hypot(Math.max(box.x0 - x, 0, x - box.x1), Math.max(box.y0 - y, 0, y - box.y1));
const gapBetween = (a: Box, b: Box) => Math.hypot(Math.max(a.x0 - b.x1, 0, b.x0 - a.x1), Math.max(a.y0 - b.y1, 0, b.y0 - a.y1));

function onBorder(box: Box, [x, y]: readonly [number, number]): boolean {
  const withinX = x >= box.x0 - ON_BORDER && x <= box.x1 + ON_BORDER;
  const withinY = y >= box.y0 - ON_BORDER && y <= box.y1 + ON_BORDER;
  const onVertical = Math.abs(x - box.x0) <= ON_BORDER || Math.abs(x - box.x1) <= ON_BORDER;
  const onHorizontal = Math.abs(y - box.y0) <= ON_BORDER || Math.abs(y - box.y1) <= ON_BORDER;
  return (onVertical && withinY) || (onHorizontal && withinX);
}

function labelBox(route: Route, text: string): Box {
  const lines = labelLines(text, route.label.wrap);
  const width = Math.max(...lines.map((line) => textWidth(line, LABEL_PX, 400)));
  const { x, y, anchor } = route.label;
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
  return { x0, y0: y - ASCENT_PX, x1: x0 + width, y1: y + (lines.length - 1) * LABEL_LINE_PX + DESCENT_PX };
}

const samples = (route: Route) => Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => pointAt(route, i / CURVE_SAMPLES));
const nearest = (box: Box, points: readonly (readonly [number, number])[]) => Math.min(...points.map((point) => distance(box, point)));

describe.each(Object.values(MAP_LAYOUTS))('$id layout', (layout: MapLayout) => {
  const ids = ECOSYSTEM_NODES.map((node) => node.id);
  const boxes = Object.fromEntries(ids.map((id) => [id, pillBox(layout, id)])) as Record<NodeId, Box>;
  const routed = ECOSYSTEM_EDGES.map((edge) => ({ edge, key: edgeKey(edge), route: layout.routes[edgeKey(edge)] }));
  const paths = routed.map(({ edge, key, route }) => ({ edge, key, points: samples(route) }));
  const labels = routed.map(({ edge, key, route }) => ({ key, box: labelBox(route, edge.label) }));

  it('places every node once, inside the drawing, clear of every other', () => {
    expect(Object.keys(layout.nodes).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const box = boxes[id];
      expect(box.x0, id).toBeGreaterThanOrEqual(0);
      expect(box.y0, id).toBeGreaterThanOrEqual(0);
      expect(box.x1, id).toBeLessThanOrEqual(layout.width);
      expect(box.y1, id).toBeLessThanOrEqual(layout.height);
      for (const other of ids) {
        if (other !== id) expect(overlaps(grow(box, NODE_MARGIN), boxes[other]), `${id} and ${other}`).toBe(false);
      }
    }
  });

  it('fits each node’s name and stack inside its pill, with room either side', () => {
    for (const id of ids) {
      const { name, stack } = nodeById(id);
      const widest = Math.max(textWidth(name, namePx(layout), 560), textWidth(stack, STACK_PX, 400));
      expect(layout.nodes[id].w - widest, `${id}: ${Math.ceil(widest)} of text in ${layout.nodes[id].w}`).toBeGreaterThanOrEqual(2 * PILL_SIDE);
    }
  });

  it('visits the nodes in reading order: every node once, top to bottom, then left to right', () => {
    expect([...layout.order].sort()).toEqual([...ids].sort());
    const places = layout.order.map((id) => layout.nodes[id]);
    for (let i = 1; i < places.length; i++) {
      const [before, after] = [places[i - 1], places[i]];
      const sameRow = Math.abs(before.cy - after.cy) < layout.pillHeight;
      expect(sameRow ? after.cx > before.cx : after.cy > before.cy, `${layout.order[i - 1]} before ${layout.order[i]}`).toBe(true);
    }
  });

  it('routes every edge, and only the edges there are', () => {
    expect(Object.keys(layout.routes).sort()).toEqual(routed.map(({ key }) => key).sort());
  });

  it('starts every edge on the border of its caller and ends it on the border of what it calls', () => {
    for (const { edge, key, route } of routed) {
      expect(onBorder(boxes[edge.from], route.from), `${key} leaves ${edge.from}`).toBe(true);
      expect(onBorder(boxes[edge.to], route.to), `${key} reaches ${edge.to}`).toBe(true);
    }
  });

  // the spacing rules list every breach at once, so one run shows the whole layout's state
  const round1 = (value: number) => Math.round(value * 10) / 10;

  it('runs no edge through a node, its own two included, and past no other node closely', () => {
    const breaches: string[] = [];
    for (const { edge, key, points } of paths) {
      for (const id of ids) {
        const crossing = points.slice(1, -1).find((point) => inside(boxes[id], point));
        if (crossing) breaches.push(`${key} crosses ${id} at ${crossing.map(Math.round).join(',')}`);
      }
      for (const id of ids.filter((id) => id !== edge.from && id !== edge.to)) {
        const gap = nearest(boxes[id], points);
        if (gap < EDGE_NODE_GAP) breaches.push(`${key} passes ${id} at ${round1(gap)}`);
      }
    }
    expect(breaches).toEqual([]);
  });

  it('keeps every label inside the drawing, clear of the nodes and of the other labels', () => {
    const breaches: string[] = [];
    for (const { key, box } of labels) {
      if (box.x0 < 0 || box.y0 < 0 || box.x1 > layout.width || box.y1 > layout.height) breaches.push(`${key} label leaves the drawing`);
      for (const id of ids) {
        const gap = gapBetween(box, boxes[id]);
        if (gap < LABEL_GAP) breaches.push(`${key} label ${round1(gap)} from ${id}`);
      }
      for (const other of labels) {
        const gap = gapBetween(box, other.box);
        if (other.key !== key && gap < LABEL_GAP) breaches.push(`${key} label ${round1(gap)} from the ${other.key} label`);
      }
    }
    expect(breaches).toEqual([]);
  });

  it('sets every label beside its own line, near enough to read as its, touching no line', () => {
    const breaches: string[] = [];
    for (const { key, box } of labels) {
      const own = nearest(box, paths.find((p) => p.key === key)!.points);
      if (own < LABEL_LINE_GAP) breaches.push(`${key} label ${round1(own)} from its line`);
      if (own > LABEL_LINE_REACH) breaches.push(`${key} label adrift, ${round1(own)} from its line`);
      for (const other of paths.filter((p) => p.key !== key)) {
        const gap = nearest(box, other.points);
        if (gap < LABEL_OTHER_LINE_GAP) breaches.push(`${key} label ${round1(gap)} from the ${other.key} line`);
      }
    }
    expect(breaches).toEqual([]);
  });
});

describe('map layouts', () => {
  it('is three, widest first: across, in rows, and down a phone, the last unscaled at 390px', () => {
    expect(Object.keys(MAP_LAYOUTS)).toEqual(['wide', 'medium', 'narrow']);
    const [wide, medium, narrow] = Object.values(MAP_LAYOUTS);
    expect(wide.width).toBeGreaterThan(wide.height);
    expect(narrow.height).toBeGreaterThan(narrow.width);
    expect(wide.width).toBeGreaterThan(medium.width);
    expect(medium.width).toBeGreaterThan(narrow.width);
    // 390px less the page gutters (2 x 16) and the plate's padding (2 x 24)
    expect(narrow.width).toBeLessThanOrEqual(390 - 2 * 16 - 2 * 24);
  });
});

describe('route geometry', () => {
  const straight: Route = { from: [0, 0], to: [10, 0], label: { x: 5, y: -4, anchor: 'middle' } };
  const curved: Route = { from: [0, 0], via: [[10, 10]], to: [20, 0], label: { x: 10, y: 12, anchor: 'middle' } };
  const cubic: Route = { from: [0, 0], via: [[0, 10], [20, 10]], to: [20, 0], label: { x: 10, y: 12, anchor: 'middle' } };

  it('writes a line, a quadratic or a cubic by how many points the route bends through', () => {
    expect(routePath(straight)).toBe('M0 0L10 0');
    expect(routePath(curved)).toBe('M0 0Q10 10 20 0');
    expect(routePath(cubic)).toBe('M0 0C0 10 20 10 20 0');
  });

  it('finds a point along each kind of route', () => {
    expect(pointAt(straight, 0.5)).toEqual([5, 0]);
    expect(pointAt(curved, 0.5)).toEqual([10, 5]);
    expect(pointAt(cubic, 0.5)).toEqual([10, 7.5]);
    for (const route of [straight, curved, cubic]) {
      expect(pointAt(route, 0)).toEqual([...route.from]);
      expect(pointAt(route, 1)).toEqual([...route.to]);
    }
  });

  it('points the arrowhead along the way the edge arrives, its tip on the end', () => {
    // arriving rightwards: the tip at the end, the base behind it
    const head = arrowHead(straight).split(' ').map((pair) => pair.split(',').map(Number));
    expect(head[0]).toEqual([10, 0]);
    expect(head[1][0]).toBeLessThan(10);
    expect(head[1][1]).toBeCloseTo(-head[2][1]);
    // a curve arrives along its last bend, here up and to the right
    const bent = arrowHead(curved).split(' ').map((pair) => pair.split(',').map(Number));
    expect(bent[0]).toEqual([20, 0]);
    expect((bent[1][1] + bent[2][1]) / 2).toBeGreaterThan(0);
  });

  it('breaks a label at its separator only where the layout asks', () => {
    expect(labelLines('HTTP · off by default')).toEqual(['HTTP · off by default']);
    expect(labelLines('HTTP · off by default', true)).toEqual(['HTTP ·', 'off by default']);
    expect(labelLines('reports', true)).toEqual(['reports']);
  });

  it('measures text from Manrope’s advances, and refuses a glyph it has not measured', () => {
    // rendered on /platform: "measurements" 83.4 at 12px, "Chimera Multi-Agent" 136.6 at 14px; never under, at most 3 over
    for (const [text, size, weight, rendered] of [['measurements', 12, 400, 83.4], ['Chimera Multi-Agent', 14, 560, 136.6]] as const) {
      expect(textWidth(text, size, weight)).toBeGreaterThanOrEqual(rendered);
      expect(textWidth(text, size, weight)).toBeLessThanOrEqual(rendered + 3);
    }
    expect(() => textWidth('→', 12, 400)).toThrow(/no advance/);
  });
});
