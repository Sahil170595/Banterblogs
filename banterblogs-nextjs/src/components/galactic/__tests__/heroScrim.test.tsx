import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GalacticHero } from '../GalacticHero';

// Final WIG re-judge P1-D. The hero copy's near-opaque scrim applied only
// below 640px, and the poster is laid out by height, so on landscape phones
// and short windows the lensed disk sat behind the copy: body copy measured
// 1.41-4.3:1 and "Papers" 2.4-3.4:1 at 667x375 to 932x430. Where the poster
// shows (touch, reduced motion, no WebGL) stars and system bodies land behind
// the copy at other heights too (r5: "1,463,000+" 1.8-1.9:1 at 1440x820 and
// 1440x850), and the physics caption sat on a bright star at 1.3-1.5:1.
// The copy now keeps the strong scrim everywhere but the live scene on a
// window of at least sm width and TALL_WINDOW_PX height, and the caption
// sits on a dark plate. Everything but one media rule reuses utilities the
// global sheet already has (it is close to the size where next/font's
// @font-face CSS splits into a second render-blocking sheet).

// shorter windows put the disk behind the copy and the system rail even in
// the live scene (r5: rail numeral 4.47:1 at 1440x789, 4.63:1 at 1440x820)
const TALL_WINDOW_PX = 801;
// the lift fades over an existing duration utility
const SCRIM_FADE = 'duration-700';
const LIVE = '.group\\/hero:has([data-scene-stage="live"])';

// comments and brace-less statements (@tailwind, @apply) out
const CSS = fs
  .readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/@[a-z-]+[^{};]*;/g, '');
const doc = new DOMParser().parseFromString(renderToStaticMarkup(<GalacticHero />), 'text/html');
const classes = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/);

// every rule in the stylesheet, with the media query it sits in ('' at top level)
function rules(css: string): Array<{ media: string; selector: string; body: string }> {
  const out: Array<{ media: string; selector: string; body: string }> = [];
  let depth = 0;
  let start = 0;
  let media = '';
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      const prelude = css.slice(start, i).trim();
      if (depth === 0 && prelude.startsWith('@media')) media = prelude;
      else if (!prelude.startsWith('@')) {
        const end = css.indexOf('}', i);
        out.push({ media: depth === 0 ? '' : media, selector: prelude, body: css.slice(i + 1, end) });
        i = end;
        start = i + 1;
        continue;
      }
      depth++;
      start = i + 1;
    } else if (css[i] === '}') {
      depth--;
      if (depth === 0) media = '';
      start = i + 1;
    }
  }
  return out;
}
const RULES = rules(CSS);
const opacityOf = (selector: string, media: string) =>
  RULES.filter((rule) => rule.media === media && rule.selector === selector)
    .map((rule) => /opacity:\s*([\d.]+)/.exec(rule.body)?.[1])
    .filter(Boolean);

describe('hero copy scrim', () => {
  const copy = doc.querySelector('h1')!.parentElement!;
  const strong = copy.querySelector('.hero-scrim-strong');

  it('keeps the phone scrim below sm and lays the same near-opaque scrim over the light one from sm', () => {
    // the block's own scrim is unchanged: near-opaque below sm, light from sm
    expect(classes(copy)).toEqual(
      expect.arrayContaining(['from-black/90', 'via-black/90', 'to-black/70', 'sm:from-black/70', 'sm:via-black/45', 'sm:to-black/15']),
    );
    expect(classes(copy)).toEqual(expect.arrayContaining(['relative', 'isolate']));
    expect(strong, 'strong layer').not.toBeNull();
    expect(strong!.getAttribute('aria-hidden')).toBe('true');
    expect(classes(strong)).toEqual(
      expect.arrayContaining(['absolute', 'inset-0', '-z-10', 'pointer-events-none', 'hidden', 'sm:block', 'from-black/90', 'via-black/90', 'to-black/70']),
    );
  });

  it('lifts the strong layer only where the live scene is behind the copy on a tall window, fading with it', () => {
    expect(opacityOf(`${LIVE} .hero-scrim-strong`, `@media (min-height: ${TALL_WINDOW_PX}px)`)).toEqual(['0']);
    // nothing else ever lightens it
    const lighteners = RULES.filter((rule) => /\.hero-scrim-strong/.test(rule.selector) && /opacity:\s*0\b/.test(rule.body));
    expect(lighteners).toHaveLength(1);
    expect(classes(strong)).toEqual(expect.arrayContaining(['transition-opacity', SCRIM_FADE]));
  });
});

describe('system rail scrim', () => {
  it('softens only on wide windows that are also tall', () => {
    const soft = RULES.filter((rule) => rule.selector === '.galactic-system-rail::before' && rule.media !== '');
    expect(soft.map((rule) => rule.media)).toEqual([`@media (min-width: 1280px) and (min-height: ${TALL_WINDOW_PX}px)`]);
  });
});

describe('physics caption', () => {
  const caption = [...doc.querySelectorAll('p')].find((p) => /Keplerian/.test(p.textContent ?? ''))!;

  it('sits on a dark plate, whatever star is behind it', () => {
    expect(caption).toBeDefined();
    expect(classes(caption)).toEqual(expect.arrayContaining(['bg-background/80', 'rounded-lg', 'backdrop-blur-sm']));
  });
});
