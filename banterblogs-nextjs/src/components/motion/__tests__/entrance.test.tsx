import fs from 'node:fs';
import path from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tailwindConfig from '../../../../tailwind.config';
import { ENTRANCE_ATTRIBUTE } from '../prePaint';
import {
  ENTRANCE_GROUP_CLASS,
  ENTRANCE_ITEM_ATTRIBUTE,
  HEAD_ENTRANCE_GROUPS,
  MAX_ENTRANCE_START_MS,
  STAGGER_GROUP_MS,
  STAGGER_ITEM_MS,
  entranceGroup,
  entranceItem,
} from '../entrance';
import { EntranceWindow } from '../EntranceWindow';

// The first-load entrance for any page (Phase R3, A2): the head rises in
// groups one --stagger-group apart, then the first content items one
// --stagger-item apart, each out of a 6px blur over the reveal token. It plays
// only on a full page load; a client-side navigation closes the window first.

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/papers' } }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const GATE = 'html[data-motion="on"][data-entrance]';

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
const reduced = TOP.filter((b) => b.prelude === '@media (prefers-reduced-motion: reduce)').flatMap((b) =>
  [...b.body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body })),
);
const cssMs = (name: string) => Number(new RegExp(`--${name}:\\s*(\\d+)ms;`).exec(CSS)?.[1]);
const revealMs = Number(String((tailwindConfig.theme?.extend?.transitionDuration as Record<string, string>).reveal).replace('ms', ''));

describe('entrance stylesheet', () => {
  it('plays on the full load of any page, only under the motion gate: groups and items, nothing else', () => {
    const animating = rules.filter((rule) => /animation:\s*entrance-/.test(rule.body));
    expect(animating.map((rule) => rule.prelude)).toEqual([`${GATE} .${ENTRANCE_GROUP_CLASS}`, `${GATE} [${ENTRANCE_ITEM_ATTRIBUTE}]`]);
  });

  it('rises every step out of a blur over the reveal token on strong-out, groups first, then items', () => {
    const rise = TOP.find((b) => b.prelude === '@keyframes entrance-rise')?.body ?? '';
    expect(rise).toMatch(/opacity:\s*0;/);
    expect(rise).toMatch(/transform:\s*translateY\(var\(--motion-rise\)\)/);
    expect(rise).toMatch(/filter:\s*blur\(var\(--blur-enter\)\)/);
    const [group, item] = rules.filter((rule) => /animation:\s*entrance-/.test(rule.body));
    for (const rule of [group, item]) expect(rule.body).toMatch(/animation:\s*entrance-rise var\(--duration-reveal\) var\(--ease-strong-out\) both;/);
    // group 0, the title, starts on the first frame, so the LCP element is never held back
    expect(group.body).toMatch(/animation-delay:\s*calc\(var\(--group, 0\) \* var\(--stagger-group\)\)/);
    expect(item.body).toMatch(
      /animation-delay:\s*calc\(var\(--entrance-items-after\) \* var\(--stagger-group\) \+ var\(--entrance-i, 0\) \* var\(--stagger-item\)\)/,
    );
    expect(Number(/--entrance-items-after:\s*(\d+);/.exec(CSS)?.[1])).toBe(HEAD_ENTRANCE_GROUPS);
  });

  it('keeps its millisecond constants on the CSS stagger tokens', () => {
    expect(STAGGER_GROUP_MS).toBe(cssMs('stagger-group'));
    expect(STAGGER_ITEM_MS).toBe(cssMs('stagger-item'));
  });

  it('stills the whole entrance under reduced motion', () => {
    const still = reduced.find((rule) => rule.selector.split(',').map((s) => s.trim()).includes(`.${ENTRANCE_GROUP_CLASS}`));
    expect(still?.selector.split(',').map((s) => s.trim())).toContain(`[${ENTRANCE_ITEM_ATTRIBUTE}]`);
    expect(still?.body).toMatch(/animation:\s*none\s*!important/);
  });
});

describe('entrance props', () => {
  it('puts a group on the group class and its index', () => {
    expect(entranceGroup(0)).toEqual({ className: ENTRANCE_GROUP_CLASS, style: { '--group': 0 } });
    expect(entranceGroup(2).style).toEqual({ '--group': 2 });
  });

  it('staggers items after the groups they follow, and never starts one past the cap', () => {
    const first = entranceItem(0, HEAD_ENTRANCE_GROUPS);
    expect(first[ENTRANCE_ITEM_ATTRIBUTE]).toBe('');
    expect(first.style).toEqual({ '--entrance-i': 0, '--entrance-items-after': HEAD_ENTRANCE_GROUPS });
    for (const after of [0, 1, 2, 3, 4]) {
      for (let index = 0; index < 20; index++) {
        const { style } = entranceItem(index, after);
        const start = after * STAGGER_GROUP_MS + Number(style['--entrance-i']) * STAGGER_ITEM_MS;
        expect(start, `after ${after}, item ${index}`).toBeLessThanOrEqual(MAX_ENTRANCE_START_MS);
        // and the sequence has settled within a second of the first frame
        expect(start + revealMs).toBeLessThanOrEqual(1000);
      }
    }
    expect(entranceItem(1, 4).style['--entrance-i']).toBe(1);
  });
});

describe('entrance window', () => {
  const html = document.documentElement;
  beforeEach(() => {
    pathname.current = '/papers';
    html.setAttribute(ENTRANCE_ATTRIBUTE, '/papers');
  });
  afterEach(() => {
    cleanup();
    html.removeAttribute(ENTRANCE_ATTRIBUTE);
  });

  it('leaves the first page its entrance', () => {
    render(<EntranceWindow />);
    expect(html.getAttribute(ENTRANCE_ATTRIBUTE)).toBe('/papers');
  });

  it('closes on the first client-side navigation, before the next page paints', () => {
    const { rerender } = render(<EntranceWindow />);
    pathname.current = '/work';
    rerender(<EntranceWindow />);
    expect(html.hasAttribute(ENTRANCE_ATTRIBUTE)).toBe(false);
  });

  it('is mounted once, in the root layout, beside the pre-paint gate', () => {
    const layout = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'layout.tsx'), 'utf8');
    expect(layout.match(/<EntranceWindow \/>/g)).toHaveLength(1);
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'motion', 'EntranceWindow.tsx'), 'utf8');
    // a passive effect could run after the next page has painted its first frame
    expect(source).toMatch(/useLayoutEffect/);
  });
});
