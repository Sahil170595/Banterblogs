import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GalacticBackdrop } from '../GalacticBackdrop';
import { landingJsonLd } from '../landingJsonLd';
import { CORE_SELECTION, STAR_SYSTEMS } from '../systems';

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
    // must serialize without lossy values (undefined drops keys silently)
    expect(JSON.stringify(jsonLd)).not.toContain('undefined');
  });
});
