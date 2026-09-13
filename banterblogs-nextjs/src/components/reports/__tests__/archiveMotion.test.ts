import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../../../tailwind.config';
import { ENTRANCE_CARDS } from '../ReportTabs';

// The archive's CSS-driven motion: the first-load entrance, the tab
// indicator and the grid fade. Component wiring is in reportTabs.test.tsx
// and reportsIndex.test.tsx.

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const ENTRANCE_GATE = 'html[data-motion="on"][data-entrance="/reports"]';
// the entrance must be over by then: a 900ms title and 600ms rises, calibrated
// 2026-09-12 to read clearly at normal speed
const SETTLED_BY_MS = 1300;
// LCP counts any painted opacity above 0; the title still reads as a heading
// on its first frame from here up
const MIN_TITLE_FROM_OPACITY = 0.3;

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
  it('plays only on a full load of /reports, under the motion gate', () => {
    const animating = rules.filter((rule) => /animation:\s*entrance-/.test(rule.body));
    expect(animating.length).toBe(4);
    for (const rule of animating) {
      for (const selector of rule.prelude.split(',')) expect(selector.trim().startsWith(ENTRANCE_GATE), selector).toBe(true);
    }
  });

  it('names every entrance keyframe entrance-*, which is what closes the window', () => {
    const names = TOP.filter((b) => b.prelude.startsWith('@keyframes entrance')).map((b) => b.prelude.split(/\s+/)[1]);
    expect(names.sort()).toEqual(['entrance-line', 'entrance-rise']);
  });

  it('brings the title into focus without hiding it: a rise out of a blur from a partial opacity, never 0', () => {
    const line = keyframes('entrance-line');
    expect(line).toMatch(/transform:\s*translateY\(var\(--entrance-rise\)\)/);
    expect(line).toMatch(/filter:\s*blur\(var\(--entrance-blur\)\)/);
    expect(line).toMatch(/opacity:\s*var\(--entrance-from-opacity\)/);
    expect(Number(/--entrance-from-opacity:\s*([\d.]+);/.exec(CSS)?.[1])).toBeGreaterThanOrEqual(MIN_TITLE_FROM_OPACITY);
    expect(CSS).toMatch(/--entrance-rise:\s*24px;/);
    expect(CSS).toMatch(/--entrance-blur:\s*12px;/);
    const lineRule = rules.find((rule) => rule.prelude.endsWith('.entrance-line'))!;
    expect(lineRule.body).toMatch(/var\(--motion-entrance\)\s+var\(--ease-entrance\)/);
    // line 0 starts at once; each later line one --stagger-line later
    expect(lineRule.body).toMatch(/animation-delay:\s*calc\(var\(--line, 0\) \* var\(--stagger-line\)\)/);
  });

  it('staggers the first cards one item step (70ms) apart and settles within 1.3s', () => {
    expect(ms('stagger-item')).toBe(70);
    const cards = rules.find((rule) => rule.prelude.endsWith('[data-entrance-card]'))!;
    expect(cards.body).toMatch(/calc\(var\(--entrance-cards-delay\) \+ var\(--entrance-i, 0\) \* var\(--stagger-item\)\)/);
    const ends = [
      ms('stagger-line') + token('entrance'),
      ms('entrance-intro-delay') + token('reveal'),
      ms('entrance-tabs-delay') + token('reveal'),
      ms('entrance-cards-delay') + (ENTRANCE_CARDS - 1) * ms('stagger-item') + token('reveal'),
    ];
    expect(Math.max(...ends)).toBeLessThanOrEqual(SETTLED_BY_MS);
  });
});

describe('archive tab motion', () => {
  it('springs the indicator on transform over the glide token, only under the motion gate', () => {
    const moving = rules.filter((rule) => rule.prelude.includes('[data-tab-indicator]') && /transition:/.test(rule.body));
    expect(moving).toHaveLength(1);
    expect(moving[0].prelude).toMatch(/^html\[data-motion="on"\]/);
    expect(moving[0].body).toMatch(/transition:\s*transform var\(--motion-glide\) var\(--ease-spring\);/);
  });

  it('fades the new grid in over the hover token after a tab change, only under the gate', () => {
    const fading = rules.filter((rule) => /animation:\s*panel-in/.test(rule.body));
    expect(fading).toHaveLength(1);
    expect(fading[0].prelude).toBe('html[data-motion="on"] [data-tab-panel][data-switched]');
    expect(fading[0].body).toMatch(/var\(--motion-hover\)/);
    expect(keyframes('panel-in')).toMatch(/opacity:\s*0/);
  });
});

describe('archive motion under reduced motion', () => {
  it.each([
    ['.entrance-line', /animation:\s*none\s*!important/],
    ['.entrance-intro', /animation:\s*none\s*!important/],
    ['.entrance-tabs', /animation:\s*none\s*!important/],
    ['[data-entrance-card]', /animation:\s*none\s*!important/],
    ['[data-tab-panel]', /animation:\s*none\s*!important/],
    ['[data-tab-indicator]', /transition:\s*none\s*!important/],
  ])('stills %s', (selector, declaration) => {
    const rule = reducedRules.find((r) => r.selector.split(',').map((s) => s.trim()).includes(selector));
    expect(rule, selector).toBeDefined();
    expect(rule!.body).toMatch(declaration);
  });
});
