import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../../../tailwind.config';
import { HEAD_ENTRANCE_GROUPS } from '@/components/motion/entrance';
import { ENTRANCE_CARD_STEPS, TABS_ENTRANCE_GROUP } from '../ReportTabs';

// The archive's CSS-driven motion: its first-load entrance, the tab highlight
// and the grid crossfade. The entrance is the shared one (Phase R3 moved its
// rules off /reports alone; components/motion/__tests__/entrance.test.tsx
// covers them); component wiring is in reportTabs.test.tsx and
// reportsIndex.test.tsx.

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const ENTRANCE_GATE = 'html[data-motion="on"][data-entrance]';
// the head moves in three groups: the title, the intro, the stats with the tabs
const HEAD_GROUPS = HEAD_ENTRANCE_GROUPS;
// a staged sequence starts every step within this (the motion brief's cap)
const MAX_ENTRANCE_START_MS = 400;
// and has settled within this
const SETTLED_BY_MS = 1000;

function blocks(css: string): Array<{ prelude: string; body: string }> {
  const out: Array<{ prelude: string; body: string }> = [];
  let start = 0;
  let depth = 0;
  let open = -1;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      if (depth === 0) open = i;
      depth++;
    } else if (css[i] === '}' && --depth === 0) {
      out.push({ prelude: css.slice(start, open).trim(), body: css.slice(open + 1, i) });
      start = i + 1;
    }
  }
  return out;
}

const TOP = blocks(CSS);
const rules = TOP.filter((b) => !b.prelude.startsWith('@'));
const keyframes = (name: string) => TOP.find((b) => b.prelude === `@keyframes ${name}`)?.body ?? '';
const reducedRules = TOP.filter((b) => b.prelude === '@media (prefers-reduced-motion: reduce)').flatMap((b) =>
  [...b.body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body })),
);
const ms = (name: string) => {
  const match = new RegExp(`--${name}:\\s*(\\d+)ms;`).exec(CSS);
  if (!match) throw new Error(`--${name} is not defined in globals.css`);
  return Number(match[1]);
};
const token = (key: string) => Number(String((tailwindConfig.theme?.extend?.transitionDuration as Record<string, string>)[key]).replace('ms', ''));

describe('archive entrance', () => {
  it('plays only on a full page load, under the motion gate', () => {
    const animating = rules.filter((rule) => /animation:\s*entrance-/.test(rule.body));
    expect(animating).toHaveLength(2);
    for (const rule of animating) {
      for (const selector of rule.prelude.split(',')) expect(selector.trim().startsWith(ENTRANCE_GATE), selector).toBe(true);
    }
  });

  it('names every entrance keyframe entrance-*, which is what closes the window', () => {
    const names = TOP.filter((b) => b.prelude.startsWith('@keyframes entrance')).map((b) => b.prelude.split(/\s+/)[1]);
    expect(names).toEqual(['entrance-rise']);
  });

  it('moves in groups, each rising out of a blur over the reveal token on strong-out', () => {
    const rise = keyframes('entrance-rise');
    // from a 1% sliver, not 0, so the LCP title is a candidate on its first frame
    expect(rise).toMatch(/opacity:\s*var\(--entrance-start-opacity\);/);
    expect(rise).toMatch(/transform:\s*translateY\(var\(--motion-rise\)\)/);
    expect(rise).toMatch(/filter:\s*blur\(var\(--blur-enter\)\)/);
    expect(CSS).toMatch(/--motion-rise:\s*12px;/);
    expect(CSS).toMatch(/--blur-enter:\s*6px;/);
    const group = rules.find((rule) => rule.prelude.endsWith('.entrance-group'))!;
    expect(group.body).toMatch(/animation:\s*entrance-rise var\(--duration-reveal\) var\(--ease-strong-out\) both;/);
    expect(group.body).toMatch(/animation-delay:\s*calc\(var\(--group, 0\) \* var\(--stagger-group\)\)/);
  });

  it('starts every step within 400ms, the first row after the head one item apart, and settles within 1s', () => {
    expect(Number(/--entrance-items-after:\s*(\d+);/.exec(CSS)?.[1])).toBe(HEAD_GROUPS);
    expect(TABS_ENTRANCE_GROUP).toBe(HEAD_GROUPS - 1);
    const cards = rules.find((rule) => rule.prelude.endsWith('[data-entrance-item]'))!;
    expect(cards.body).toMatch(
      /calc\(var\(--entrance-items-after\) \* var\(--stagger-group\) \+ var\(--entrance-i, 0\) \* var\(--stagger-item\)\)/,
    );
    const lastStart = HEAD_GROUPS * ms('stagger-group') + (ENTRANCE_CARD_STEPS - 1) * ms('stagger-item');
    expect(lastStart).toBeLessThanOrEqual(MAX_ENTRANCE_START_MS);
    expect(lastStart + token('reveal')).toBeLessThanOrEqual(SETTLED_BY_MS);
  });
});

describe('archive tab motion', () => {
  it('moves the highlight by its clip over base on strong-out, only under the motion gate', () => {
    const moving = rules.filter((rule) => rule.prelude.includes('[data-tab-highlight]') && /transition:/.test(rule.body));
    expect(moving).toHaveLength(1);
    expect(moving[0].prelude).toMatch(/^html\[data-motion="on"\]/);
    expect(moving[0].body).toMatch(/transition:\s*clip-path var\(--duration-base\) var\(--ease-strong-out\);/);
    const clip = rules.find((rule) => rule.prelude === '[data-tab-highlight]')!;
    expect(clip.body).toMatch(/clip-path:\s*inset\(0 var\(--highlight-right, 100%\) 0 var\(--highlight-left, 0px\)/);
    expect(clip.body).toMatch(/visibility:\s*hidden/);
  });

  it('crossfades the grid out of a 2px blur over the fast token after a pointer change, only under the gate', () => {
    const fading = rules.filter((rule) => /animation:\s*panel-in/.test(rule.body));
    expect(fading).toHaveLength(1);
    expect(fading[0].prelude).toBe('html[data-motion="on"] [data-tab-panel][data-switched]');
    expect(fading[0].body).toMatch(/var\(--duration-fast\) var\(--ease-strong-out\)/);
    expect(keyframes('panel-in')).toMatch(/opacity:\s*0/);
    expect(keyframes('panel-in')).toMatch(/filter:\s*blur\(var\(--blur-crossfade\)\)/);
    expect(CSS).toMatch(/--blur-crossfade:\s*2px;/);
  });
});

// Phase R4: every navigation into or out of the archive styles, lays out and
// captures the whole page, 55 cards of drawings (about 140ms of style and
// layout inside the view transition, measured on a local build). Cards and
// sections off screen skip that work until they near the viewport. Paint
// containment would clip a card's hover glow, so the clip edge sits past it.
describe('archive rendering', () => {
  const declarationsOf = (selector: string) =>
    rules.filter((rule) => rule.prelude.split(',').map((s) => s.trim()).includes(selector)).map((rule) => rule.body).join(';');
  const px = (name: string) => {
    const match = new RegExp(`--${name}:\\s*(\\d+)px;`).exec(CSS);
    if (!match) throw new Error(`--${name} is not defined in px in globals.css`);
    return Number(match[1]);
  };

  it.each(['.archive-card-slot', '.archive-section'])('skips %s off screen, keeping its drawn height once rendered', (selector) => {
    const body = declarationsOf(selector);
    // auto unless the page view has turned skipping off (--cv, contentVisibility.ts)
    expect(body).toMatch(/content-visibility:\s*var\(--cv, auto\)/);
    expect(body).toMatch(/contain-intrinsic-block-size:\s*auto var\(--archive-estimate-[\w-]+\)/);
    expect(body).toMatch(/overflow-clip-margin:\s*var\(--card-glow-extent\)/);
  });

  it('keeps the clip edge outside a card glow: its blur less its spread, plus its drop and the lift', () => {
    const glow = /\.card-lift::after\s*\{[^}]*box-shadow:[^;]*,\s*0 (\d+)px (\d+)px -(\d+)px/.exec(CSS);
    expect(glow).not.toBeNull();
    const [, drop, blur, spread] = glow!.slice(0, 4).map(Number);
    const lift = px('motion-lift');
    expect(px('card-glow-extent')).toBeGreaterThanOrEqual(blur - spread + drop + lift);
  });
});

describe('archive motion under reduced motion', () => {
  it.each([
    ['.entrance-group', /animation:\s*none\s*!important/],
    ['[data-entrance-item]', /animation:\s*none\s*!important/],
    ['[data-tab-panel]', /animation:\s*none\s*!important/],
    ['[data-tab-highlight]', /transition:\s*none\s*!important/],
  ])('stills %s', (selector, declaration) => {
    const rule = reducedRules.find((r) => r.selector.split(',').map((s) => s.trim()).includes(selector));
    expect(rule, selector).toBeDefined();
    expect(rule!.body).toMatch(declaration);
  });
});
