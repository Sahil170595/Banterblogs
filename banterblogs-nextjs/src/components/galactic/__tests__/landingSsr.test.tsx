import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NAV_RECEDE_ATTRIBUTE, NAV_RECEDE_SCOPE_ATTRIBUTE, recedeAround } from '@/components/motion/navRecede';
import { GalacticBackdrop } from '../GalacticBackdrop';
import { GalacticHero } from '../GalacticHero';
import { landingJsonLd } from '../landingJsonLd';
import { CORE_SELECTION, STAR_SYSTEMS } from '../systems';

// The core already links to the systems page from the scene and the poster,
// so the hero's two calls to action go where the scene does not: the raw
// evidence and the peer-reviewed papers.
describe('landing hero calls to action', () => {
  const hero = renderToStaticMarkup(<GalacticHero />);

  it('leads to the research archive, then the papers', () => {
    expect(hero).toMatch(/href="\/reports"[^>]*>\s*Research archive/);
    expect(hero).toMatch(/href="\/papers"[^>]*>\s*Papers/);
  });

  // Phase R5 (design re-judge P1-C): a click answers at once in the copy,
  // which bounds the recede, while the scene behind it stays lit for the
  // push into the next page
  it('bounds the recede of a followed call to action to the copy layer', () => {
    document.body.innerHTML = `<main>${hero}</main>`;
    try {
      recedeAround(document.querySelector<HTMLAnchorElement>('a[href="/reports"]')!);
      const receded = [...document.querySelectorAll(`[${NAV_RECEDE_ATTRIBUTE}]`)];

      expect(receded.some((el) => el.contains(document.querySelector('h1')))).toBe(true);
      expect(receded.some((el) => el.querySelector('a[href="/papers"]') || el.matches('a[href="/papers"]'))).toBe(true);
      expect(document.querySelector('[data-scene-poster]')?.closest(`[${NAV_RECEDE_ATTRIBUTE}]`)).toBeNull();
      expect(receded.every((el) => el.closest(`[${NAV_RECEDE_SCOPE_ATTRIBUTE}]`))).toBe(true);
    } finally {
      document.body.innerHTML = '';
    }
  });
});

// The landing is a WebGL canvas — crawlers and screen readers only ever see
// the server-rendered HTML (mode 'pending', i.e. the poster branch). This
// contract pins what that first paint must carry: every system's name AND
// blurb, plus machine-readable structured data.

describe('landing SSR text contract', () => {
  const ssr = renderToStaticMarkup(<GalacticBackdrop />);

  it('server-renders every system name, blurb, and destination', () => {
    for (const system of STAR_SYSTEMS) {
      expect(ssr).toContain(system.name);
      expect(ssr).toContain(system.blurb);
      expect(ssr).toContain(`href="${system.href}"`);
    }
  });

  it('server-renders the core with its blurb', () => {
    expect(ssr).toContain(CORE_SELECTION.name);
    expect(ssr).toContain(CORE_SELECTION.eyebrow);
    expect(ssr).toContain(CORE_SELECTION.blurb);
    expect(ssr).toContain(`href="${CORE_SELECTION.href}"`);
  });
});

describe('landing JSON-LD', () => {
  const jsonLd = landingJsonLd();

  it('lists all nine systems with descriptions and absolute URLs', () => {
    expect(jsonLd.mainEntity.numberOfItems).toBe(STAR_SYSTEMS.length);
    expect(jsonLd.mainEntity.itemListElement).toHaveLength(STAR_SYSTEMS.length);

    jsonLd.mainEntity.itemListElement.forEach((entry, i) => {
      expect(entry.position).toBe(i + 1);
      expect(entry.item.name).toBe(STAR_SYSTEMS[i].name);
      expect(entry.item.description).toBe(STAR_SYSTEMS[i].blurb);
      expect(entry.item.url).toMatch(/^https:\/\//);
    });
  });

  it('describes the core and carries author/publisher like the report schema', () => {
    expect(jsonLd.about.name).toBe(CORE_SELECTION.name);
    expect(jsonLd.about.description).toBe(CORE_SELECTION.blurb);
    expect(jsonLd.author.name).toBe('Sahil Kadadekar');
    expect(jsonLd.publisher.name).toBe('Chimeraforge');
    // JSON.stringify DROPS undefined values rather than emitting "undefined",
    // so a substring check can never fail. Assert the keys survive instead.
    const roundTripped = JSON.parse(JSON.stringify(jsonLd));
    for (const key of ['name', 'description', 'url', 'about', 'author', 'publisher']) {
      expect(roundTripped[key], `landing JSON-LD lost ${key}`).toBeTruthy();
    }
  });
});
