import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENTRANCE_ATTRIBUTE } from '@/components/motion/prePaint';
import { GLASS_ATTRIBUTE, GLASS_WARM, HEADER_GLASS_FLOOR, warmHeaderGlass } from '../headerGlass';
import { Header } from '../Header';

// The header glass on a cold GPU (Phase R3-B1). Chrome compiles the backdrop
// blur's shader programs the first time the layer is drawn: 4 programs,
// ~47 ms on the GPU main thread in a traced cold run. At opacity 0 the layer
// is never drawn, so that compile used to land on the first scrolled frame
// (25-50 ms frames at 5-8 px of scroll on every cold run). Once the page has
// settled, the glass rests at a floor too faint to see, and the compile runs
// while nothing moves.

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/reports' } }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));
vi.mock('../SearchDialog', () => ({ SearchDialog: () => null }));

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const root = document.documentElement;

function setReadyState(state: Document['readyState']) {
  Object.defineProperty(document, 'readyState', { value: state, configurable: true });
}

afterEach(() => {
  cleanup();
  root.removeAttribute(ENTRANCE_ATTRIBUTE);
  setReadyState('complete');
});

// MutationObserver callbacks run as microtasks
const flush = () => act(() => Promise.resolve());

describe('warmHeaderGlass', () => {
  it('warms at once on a loaded page whose entrance window is closed', () => {
    const header = document.createElement('header');
    warmHeaderGlass(header);
    expect(header.getAttribute(GLASS_ATTRIBUTE)).toBe(GLASS_WARM);
  });

  it('waits for the load event, then for the first-load entrance to finish, so it never stalls the entrance', async () => {
    setReadyState('loading');
    root.setAttribute(ENTRANCE_ATTRIBUTE, '/reports');
    const header = document.createElement('header');
    warmHeaderGlass(header);

    window.dispatchEvent(new Event('load'));
    await flush();
    expect(header.hasAttribute(GLASS_ATTRIBUTE)).toBe(false);

    root.removeAttribute(ENTRANCE_ATTRIBUTE);
    await flush();
    expect(header.getAttribute(GLASS_ATTRIBUTE)).toBe(GLASS_WARM);
  });

  it('stops waiting when its header unmounts', async () => {
    setReadyState('loading');
    const header = document.createElement('header');
    warmHeaderGlass(header)();
    window.dispatchEvent(new Event('load'));
    await flush();
    expect(header.hasAttribute(GLASS_ATTRIBUTE)).toBe(false);

    setReadyState('complete');
    root.setAttribute(ENTRANCE_ATTRIBUTE, '/reports');
    const second = document.createElement('header');
    warmHeaderGlass(second)();
    root.removeAttribute(ENTRANCE_ATTRIBUTE);
    await flush();
    expect(second.hasAttribute(GLASS_ATTRIBUTE)).toBe(false);
  });
});

describe('the warmed glass', () => {
  it('rests the interior header glass at a floor too faint to see, on the same scroll timeline, for visitors who allow motion', () => {
    expect(HEADER_GLASS_FLOOR).toBeGreaterThan(0);
    expect(HEADER_GLASS_FLOOR).toBeLessThanOrEqual(0.02);
    expect(CSS).toMatch(new RegExp(`--header-glass-floor:\\s*${HEADER_GLASS_FLOOR};`));
    const frames = /@keyframes header-surface-warm \{([\s\S]*?)\}\s*\}/.exec(CSS)?.[1] ?? '';
    expect(frames).toMatch(/opacity:\s*var\(--header-glass-floor\)/);
    expect(frames).not.toMatch(/blur|filter|transform/);
    // gated like the fade it replaces; only the name changes, so the timeline and range carry over
    const gates = [...CSS.matchAll(/@supports \(animation-timeline: scroll\(\)\) \{\s*@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\}\s*\}/g)].map((m) => m[1]);
    const warm = gates.find((body) => body.includes(`.site-header[${GLASS_ATTRIBUTE}="${GLASS_WARM}"]::before`));
    expect(warm).toBeDefined();
    expect(warm).toMatch(/animation-name:\s*header-surface-warm;/);
    expect(warm).not.toMatch(/animation:|animation-timeline|animation-range/);
  });

  it('is warmed by the interior header, not the landing one', () => {
    pathname.current = '/reports';
    expect(render(<Header />).container.querySelector('header')?.getAttribute(GLASS_ATTRIBUTE)).toBe(GLASS_WARM);
    cleanup();
    pathname.current = '/';
    expect(render(<Header />).container.querySelector('header')?.hasAttribute(GLASS_ATTRIBUTE)).toBe(false);
  });
});
