import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CORE_ID, ECOSYSTEM_NODES, nodeById } from '@/lib/ecosystem';
import { ECOSYSTEM_EDGES, describeEdge, edgeKey, edgeLine, neighboursOf } from '../connections';
import { EcosystemMap, MAP_IDLE_READOUT, systemAnchor } from '../EcosystemMap';
import { MAP_LAYOUTS, type MapLayout } from '../mapLayout';

// The /platform map: the core and the nine repositories as nodes, who calls
// whom as arrows. It is a server-rendered SVG, complete without JavaScript:
// every node is a link to its section, every edge is also a sentence in a
// list. Hovering or focusing a node (the one client island) lights its edges
// and dims the rest.

const COMPONENT_DIR = path.join(process.cwd(), 'src', 'components', 'platform');
const CSS = fs.readFileSync(path.join(COMPONENT_DIR, 'map.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const LAYOUTS = Object.values(MAP_LAYOUTS);

describe('ecosystem map, as served', () => {
  const html = renderToStaticMarkup(<EcosystemMap />);

  it('names every node in the server HTML, with its languages', () => {
    for (const node of ECOSYSTEM_NODES) {
      expect(html, node.id).toContain(`>${node.name}</text>`);
      expect(html, node.id).toContain(`>${node.stack}</text>`);
    }
  });

  it('writes every connection as a sentence in the server HTML', () => {
    const escaped = (sentence: string) => sentence.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');
    for (const edge of ECOSYSTEM_EDGES) expect(html, edgeKey(edge)).toContain(escaped(describeEdge(edge)));
  });

  it('needs no script to be read: nothing is hidden, and every node link works on its own', () => {
    expect(html).not.toMatch(/opacity:\s*0|visibility:\s*hidden|hidden=""/);
    expect(html).toContain(`href="#${systemAnchor('banterpacks')}"`);
  });
});

describe('ecosystem map', () => {
  const mount = () => render(<EcosystemMap />).container;

  it('is a captioned figure on the house plate, drawn once per layout', () => {
    const figure = mount().querySelector('figure')!;
    expect(figure.classList.contains('flow')).toBe(true);
    expect(text(figure.querySelector('figcaption')).length).toBeGreaterThan(40);
    const drawings = [...figure.querySelectorAll('svg[data-layout]')];
    expect(drawings.map((svg) => svg.getAttribute('data-layout'))).toEqual(['wide', 'medium', 'narrow']);
    for (const [i, svg] of drawings.entries()) {
      expect(svg.getAttribute('viewBox')).toBe(`0 0 ${LAYOUTS[i].width} ${LAYOUTS[i].height}`);
      expect(svg.getAttribute('role')).toBe('group');
      expect(svg.getAttribute('aria-label')).toMatch(/Chimera core and the nine repositories/);
    }
  });

  it('draws each node as a link to its section, named with its role, in reading order', () => {
    for (const [i, svg] of [...mount().querySelectorAll('svg[data-layout]')].entries()) {
      const links = [...svg.querySelectorAll('a[data-node]')];
      expect(links.map((a) => a.getAttribute('data-node'))).toEqual([...LAYOUTS[i].order]);
      for (const link of links) {
        const node = nodeById(link.getAttribute('data-node') as never);
        expect(link.getAttribute('href')).toBe(`#${systemAnchor(node.id)}`);
        expect(link.getAttribute('aria-label')).toBe(`${node.name}: ${node.blurb}`);
        expect([...link.querySelectorAll('text')].map(text)).toEqual([node.name, node.stack]);
        // the pill, then the focus ring drawn round it
        expect([...link.querySelectorAll('rect')].map((rect) => rect.getAttribute('class'))).toEqual([expect.stringMatching(/pill/), expect.stringMatching(/ring/)]);
        // itself and its neighbours: what lights when it is traced
        expect(link.getAttribute('data-links')!.split(' ').sort()).toEqual([node.id, ...neighboursOf(node.id)].sort());
      }
    }
  });

  it('sends the core to the engines that host it, and each repository to its own row', () => {
    expect(systemAnchor(CORE_ID)).toBe('core-engines');
    expect(systemAnchor('echo')).toBe('system-echo');
    expect(new Set(ECOSYSTEM_NODES.map((node) => systemAnchor(node.id))).size).toBe(ECOSYSTEM_NODES.length);
  });

  it('draws each edge as a line, an arrowhead and its label, by what it is: call, data or not running', () => {
    for (const svg of mount().querySelectorAll('svg[data-layout]')) {
      const edges = [...svg.querySelectorAll('g[data-edge]')];
      expect(edges.map((g) => g.getAttribute('data-edge'))).toEqual(ECOSYSTEM_EDGES.map(edgeKey));
      for (const [i, g] of edges.entries()) {
        const edge = ECOSYSTEM_EDGES[i];
        expect(g.getAttribute('data-line')).toBe(edgeLine(edge));
        expect(g.getAttribute('data-links')).toBe(`${edge.from} ${edge.to}`);
        expect(g.querySelectorAll('polygon')).toHaveLength(1);
        expect(text(g.querySelector('text'))).toBe(edge.label.replace(/\s+/g, ' '));
        // the list says it in words; the drawing is not read twice
        expect(g.closest('[aria-hidden="true"]')).not.toBeNull();
      }
    }
  });

  it('marks the one ember node: the core', () => {
    for (const svg of mount().querySelectorAll('svg[data-layout]')) {
      expect([...svg.querySelectorAll('a[data-core]')].map((a) => a.getAttribute('data-node'))).toEqual([CORE_ID]);
    }
  });

  it('keys the three kinds of line, and offers the connections as a list', () => {
    const figure = mount().querySelector('figure')!;
    const legend = figure.querySelector('ul[aria-label="Line styles"]')!;
    expect([...legend.querySelectorAll('li')].map((li) => li.getAttribute('data-line'))).toEqual(['call', 'data', 'inactive']);
    for (const li of legend.querySelectorAll('li')) expect(text(li).length).toBeGreaterThan(8);
    const list = figure.querySelector('details')!;
    expect(text(list.querySelector('summary'))).toBe(`Read the ${ECOSYSTEM_EDGES.length} connections as a list`);
    expect([...list.querySelectorAll('li')].map(text)).toEqual(ECOSYSTEM_EDGES.map(describeEdge));
  });
});

describe('ecosystem map, traced', () => {
  const mount = () => render(<EcosystemMap />).container;
  const lit = (root: Element, selector: string) =>
    [...root.querySelectorAll(`svg[data-layout="wide"] ${selector}`)].filter((el) => el.hasAttribute('data-lit'));

  it('rests with nothing lit and a line that says what a node does when chosen', () => {
    const page = mount();
    expect(page.querySelector('[data-active]')).toBeNull();
    expect(page.querySelectorAll('[data-lit]')).toHaveLength(0);
    expect(text(page.querySelector('[data-map-readout]'))).toBe(MAP_IDLE_READOUT);
  });

  it('lights a hovered node, its edges and its neighbours, and reads out its role', () => {
    const page = mount();
    const echo = page.querySelector('svg[data-layout="wide"] a[data-node="echo"]')!;
    fireEvent.pointerOver(echo.querySelector('rect')!);
    expect(page.querySelector('[data-active]')!.getAttribute('data-active')).toBe('echo');
    expect(lit(page, 'a[data-node]').map((a) => a.getAttribute('data-node')).sort()).toEqual(['banterpacks', 'echo']);
    expect(lit(page, 'g[data-edge]').map((g) => g.getAttribute('data-edge'))).toEqual(['echo>banterpacks']);
    expect(text(page.querySelector('[data-map-readout]'))).toBe(`Echo: ${nodeById('echo').blurb}`);
  });

  it('does the same for keyboard focus, and rests again when focus leaves', () => {
    const page = mount();
    const core = page.querySelector<SVGAElement>(`svg[data-layout="wide"] a[data-node="${CORE_ID}"]`)!;
    fireEvent.focusIn(core);
    expect(lit(page, 'g[data-edge]').map((g) => g.getAttribute('data-edge')).sort()).toEqual(
      ECOSYSTEM_EDGES.filter((edge) => edge.from === CORE_ID || edge.to === CORE_ID).map(edgeKey).sort(),
    );
    fireEvent.focusOut(core);
    expect(page.querySelector('[data-active]')).toBeNull();
    expect(page.querySelectorAll('[data-lit]')).toHaveLength(0);
    expect(text(page.querySelector('[data-map-readout]'))).toBe(MAP_IDLE_READOUT);
  });

  it('rests when the pointer leaves the node for the empty plate, unless a node still has focus', () => {
    const page = mount();
    const svg = page.querySelector('svg[data-layout="wide"]')!;
    const echo = svg.querySelector('a[data-node="echo"]')!;
    const droid = svg.querySelector<SVGAElement>('a[data-node="chimeradroid"]')!;
    fireEvent.pointerOver(echo);
    fireEvent.pointerOver(svg);
    expect(page.querySelector('[data-active]')).toBeNull();
    // focus holds the trace while the pointer wanders
    droid.focus();
    fireEvent.focusIn(droid);
    fireEvent.pointerOver(echo);
    expect(page.querySelector('[data-active]')!.getAttribute('data-active')).toBe('echo');
    fireEvent.pointerOver(svg);
    expect(page.querySelector('[data-active]')!.getAttribute('data-active')).toBe('chimeradroid');
  });
});

describe('ecosystem map styles', () => {
  const rules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));

  it('shows the phone layout by default, and each wider one by the figure’s own width, never shrunk and never far grown', () => {
    const REM_PX = 16;
    // a drawing may grow this far past its own width before it outsizes the page's text
    const MAX_GROWTH = 1.15;
    expect(CSS).toMatch(/\.map\s*\{[^}]*container-type:\s*inline-size/);
    // outside any query: the phone drawing shows, the others wait
    const base = CSS.replace(/@container[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '');
    expect(base).toMatch(/\.medium\s*\{[^}]*display:\s*none/);
    expect(base).toMatch(/\.wide\s*\{[^}]*display:\s*none/);
    expect(base).not.toMatch(/\.narrow\s*\{[^}]*display:\s*none/);
    const queries = [...CSS.matchAll(/@container ([\w-]+) \(min-width: ([\d.]+)rem\)\s*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)].map(([, name, rem, body]) => ({
      name,
      px: Number(rem) * REM_PX,
      body,
    }));
    expect(queries).toHaveLength(2);
    const shownBy = (layout: MapLayout) => queries.find((q) => new RegExp(`\\.${layout.id}\\s*\\{[^}]*display:\\s*block`).test(q.body));
    // each wider drawing, and the one it replaces
    for (const [layout, before] of [
      [MAP_LAYOUTS.medium, MAP_LAYOUTS.narrow],
      [MAP_LAYOUTS.wide, MAP_LAYOUTS.medium],
    ] as const) {
      const query = shownBy(layout)!;
      expect(query, `${layout.id} has a query`).toBeDefined();
      expect(query.name).toBe('ecosystem-map');
      // shown only once there is room for it at its own size, and the one before it steps aside
      expect(query.px, layout.id).toBeGreaterThanOrEqual(layout.width);
      expect(query.body).toMatch(new RegExp(`\\.${before.id}\\s*\\{[^}]*display:\\s*none`));
    }
    for (const layout of LAYOUTS) {
      const cap = new RegExp(`\\.${layout.id}\\s*\\{[^}]*max-width:\\s*([\\d.]+)rem`).exec(base);
      expect(cap, `${layout.id} is capped`).not.toBeNull();
      const capPx = Number(cap![1]) * REM_PX;
      expect(capPx, layout.id).toBeGreaterThanOrEqual(layout.width);
      expect(capPx, layout.id).toBeLessThanOrEqual(layout.width * MAX_GROWTH);
    }
  });

  it('draws the site’s focus ring on the pill’s own shape, in place of the square outline', () => {
    expect(CSS).toMatch(/:root a\.node:focus-visible\s*\{[^}]*outline:\s*none[^}]*box-shadow:\s*none/);
    expect(CSS).toMatch(/\.node:focus-visible \.ring\s*\{[^}]*stroke:\s*hsl\(var\(--primary\)\)[^}]*stroke-width:\s*2/);
    expect(CSS).toMatch(/\.ring\s*\{[^}]*stroke:\s*none/);
  });

  it('moves only while motion is armed: the edges draw in once, on the reveal token', () => {
    const moving = rules.filter((rule) => /animation\s*:/.test(rule.body));
    expect(moving.length).toBeGreaterThan(0);
    for (const rule of moving) {
      // one selector each (the comma is inside :is()), led by the motion gate
      expect(rule.selector.replace(/:is\([^)]*\)/g, '')).not.toContain(',');
      expect(rule.selector).toMatch(/^html\[data-motion="on"\] /);
      expect(rule.body).toMatch(/var\(--duration-(reveal|enter)\)/);
      expect(rule.body).toMatch(/var\(--ease-strong-out\)/);
      // once, never looping
      expect(rule.body).not.toMatch(/infinite/);
    }
    // held undrawn only while its reveal is pending, and only with motion armed
    const held = rules.filter((rule) => /stroke-dashoffset:\s*1\b/.test(rule.body) && !/^(from|to|\d+%)$/.test(rule.selector));
    expect(held.length).toBeGreaterThan(0);
    for (const rule of held) expect(rule.selector).toMatch(/^html\[data-motion="on"\] \[data-reveal="pending"\]/);
  });

  it('eases colour and opacity only, on the tokens, and never every property', () => {
    for (const rule of rules.filter((r) => /transition\s*:/.test(r.body))) {
      expect(rule.body, rule.selector).not.toMatch(/transition:\s*all/);
      expect(rule.body, rule.selector).not.toMatch(/transform/);
      expect(rule.body, rule.selector).toMatch(/var\(--duration-(fast|hover)\)/);
    }
  });

  it('starts every edge within the entrance cap', () => {
    // --edge-i steps one --stagger-item (50ms) after one --stagger-group (80ms): capped so the last starts by 400ms
    const steps = [...render(<EcosystemMap />).container.querySelectorAll<SVGGElement>('g[data-edge]')].map((g) => Number(g.style.getPropertyValue('--edge-i')));
    expect(Math.max(...steps) * 50 + 80).toBeLessThanOrEqual(400);
    expect(new Set(steps).size).toBeGreaterThan(1);
  });

  it('spends ember on the core and on what is traced, nothing else', () => {
    const ember = rules.filter((rule) => /var\(--primary\)/.test(rule.body)).map((rule) => rule.selector);
    expect(ember.length).toBeGreaterThan(0);
    for (const selector of ember) expect(selector).toMatch(/data-core|data-lit|:hover|:focus-visible/);
  });
});
