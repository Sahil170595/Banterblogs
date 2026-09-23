import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GalacticHero } from '../GalacticHero';
import { SelectionCard } from '../SelectionCard';
import { STAR_SYSTEMS } from '../systems';

// Phase R7 (design re-judge P1-C): the landing was a type island, its heading
// 30/600 in a face of its own and eight of its read labels under the site's
// 12px floor (9-11px). Its copy now speaks the interior's two voices: Manrope
// in the title and copy roles, JetBrains Mono in the one label role.

// the site's smallest read text
const FLOOR_PX = 12;
// WCAG AA for text under 24px: the second heading line is 22px on phones
const AA_NORMAL_TEXT = 4.5;
// its tone over the hero scrim, measured on glyph boxes (r7 type/finals):
// foreground/45 gave 4.22:1, foreground/55 gives 5.96:1
const LINE_TWO_MIN_ALPHA = 55;

const GALACTIC = path.join(process.cwd(), 'src', 'components', 'galactic');
const classes = (el: Element | null | undefined) => (el?.getAttribute('class') ?? '').split(/\s+/);
const hero = new DOMParser().parseFromString(renderToStaticMarkup(<GalacticHero />), 'text/html');

describe('landing hero type', () => {
  const h1 = hero.querySelector('h1')!;

  it('sets the heading in the landing title role and nothing else that sizes or shapes it', () => {
    expect(classes(h1)).toContain('text-display-32');
    expect(classes(h1).filter((c) => /^(?:[\w-]+:)?(?:display$|font-|text-(?:\d?xl|\[)|tracking-|leading-)/.test(c))).toEqual([]);
  });

  it(`keeps the second line in a muted tone that still clears ${AA_NORMAL_TEXT}:1 at phone size`, () => {
    const tone = classes(h1.querySelector('span')).map((c) => /^text-foreground\/(\d+)$/.exec(c)?.[1]).find(Boolean);
    expect(Number(tone)).toBeGreaterThanOrEqual(LINE_TWO_MIN_ALPHA);
    expect(Number(tone)).toBeLessThan(100);
  });

  it('sets the eyebrow, the calls to action and the bottom labels in the mono label role', () => {
    const paragraphs = [...hero.querySelectorAll('p')];
    const eyebrow = h1.previousElementSibling;
    const actions = hero.querySelector('a[href="/reports"]')!.parentElement;
    const caption = paragraphs.find((p) => /Keplerian/.test(p.textContent ?? ''));
    const hint = paragraphs.find((p) => /Select a system/.test(p.textContent ?? ''));
    for (const [name, el] of Object.entries({ eyebrow, actions, caption, hint })) {
      expect(el, name).toBeTruthy();
      expect(classes(el), name).toContain('text-label-12-mono');
    }
    expect(classes(h1.nextElementSibling)).toContain('text-copy-14');
  });

  // the owner keeps the landing's eyebrow ember; it reads over the copy
  // scrim, and the e2e landingContrast spec holds it to AA
  it('sets the landing eyebrow in ember', () => {
    expect(classes(h1.previousElementSibling)).toContain('text-primary');
  });

  it(`keeps every read line of the landing copy and the selection card at ${FLOOR_PX}px or more`, () => {
    for (const file of ['GalacticHero.tsx', 'SelectionCard.tsx']) {
      const source = fs.readFileSync(path.join(GALACTIC, file), 'utf8');
      const sizes = [...source.matchAll(/text-\[([\d.]+)(px|rem)\]/g)].map(([, n, unit]) => Number(n) * (unit === 'rem' ? 16 : 1));
      expect(sizes.filter((px) => px < FLOOR_PX), file).toEqual([]);
    }
  });
});

describe('selection card type', () => {
  const card = new DOMParser().parseFromString(
    renderToStaticMarkup(<SelectionCard selection={{ kind: 'star', system: STAR_SYSTEMS[0] }} onClose={() => undefined} />),
    'text/html',
  );

  it('titles the card in the heading role and labels it in the mono label role', () => {
    const title = card.querySelector('h2');
    expect(classes(title)).toContain('text-heading-24');
    expect(classes(title).filter((c) => /^(?:display$|font-|text-(?:\d?xl|\[)|tracking-)/.test(c))).toEqual([]);
    expect(classes(card.querySelector('p'))).toContain('text-label-12-mono');
  });
});
