import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { discoverReportsUnique } from '@/lib/reports/locator';
import { PHASE_DEFINITIONS, phaseWhitepaperSlug, type PhaseKey } from '@/lib/reports/phases';
import { MAX_VISUAL_BYTES, ReportVisual, VISUAL_FAMILIES, visualStyleFor } from '../ReportVisual';

const draw = (slug: string, accent = false) => renderToStaticMarkup(<ReportVisual slug={slug} accent={accent} />);

// a real slug in each TR-numbered phase, plus the pinned Phase 0 baselines
const SAMPLE_BY_PHASE: Record<PhaseKey, string> = {
  phase0: 'gemma3',
  phase1: 'technical-report-108',
  phase2: 'technical-report-118',
  phase3: 'technical-report-125',
  phase4: 'technical-report-134',
  phase5: 'technical-report-138',
  phase6: 'technical-report-145',
  phase7: 'technical-report-163',
  phase8: 'technical-report-164',
  phase9: 'technical-report-167',
};

describe('per-report visual', () => {
  it('draws the same SVG for the same slug, every time', () => {
    for (const slug of Object.values(SAMPLE_BY_PHASE)) {
      expect(draw(slug)).toBe(draw(slug));
    }
  });

  it('lets the phase pick the family and the slug pick the parameters', () => {
    const [a, b] = ['technical-report-138', 'technical-report-139'];
    expect(visualStyleFor(a).family).toBe(visualStyleFor(b).family);
    expect(draw(a)).not.toBe(draw(b));
  });

  it('gives every phase a family, no family to more than two phases', () => {
    const uses = new Map<string, number>();
    for (const { key } of PHASE_DEFINITIONS) {
      const { family } = visualStyleFor(SAMPLE_BY_PHASE[key]);
      expect(VISUAL_FAMILIES, key).toContain(family);
      uses.set(family, (uses.get(family) ?? 0) + 1);
      expect(draw(SAMPLE_BY_PHASE[key])).toContain(`data-family="${family}"`);
    }
    expect(Math.max(...uses.values())).toBeLessThanOrEqual(2);
  });

  it('draws a synthesis document in its phase family, with plate marks', () => {
    for (const { key, hasWhitepaper } of PHASE_DEFINITIONS) {
      if (!hasWhitepaper) continue;
      const whitepaper = phaseWhitepaperSlug(key);
      expect(visualStyleFor(whitepaper).family, key).toBe(visualStyleFor(SAMPLE_BY_PHASE[key]).family);
      expect(visualStyleFor(whitepaper).synthesis, key).toBe(true);
      expect(draw(whitepaper)).toContain('data-synthesis="true"');
      expect(visualStyleFor(SAMPLE_BY_PHASE[key]).synthesis, key).toBe(false);
    }
    expect(visualStyleFor('compendium').synthesis).toBe(true);
  });

  it('stays small, decorative and free of ids for every report on disk', () => {
    const slugs = [...discoverReportsUnique().map((entry) => entry.slug), 'compendium'];
    expect(slugs.length).toBeGreaterThan(50);
    for (const slug of slugs) {
      const svg = draw(slug);
      expect(svg.length, slug).toBeLessThanOrEqual(MAX_VISUAL_BYTES);
      expect(svg, slug).toMatch(/^<svg[^>]*\baria-hidden="true"/);
      expect(svg, slug).toMatch(/^<svg[^>]*\bfocusable="false"/);
      expect(svg, slug).toMatch(/^<svg[^>]*\bviewBox="0 0 320 180"/);
      // no text to announce, nothing to fetch, nothing to collide across 60 cards
      expect(svg, slug).not.toMatch(/<(text|image|script|use|foreignObject)\b|\sid="|NaN|Infinity/);
    }
  });

  it('uses the ember accent only where asked', () => {
    expect(draw('technical-report-167', true)).toContain('data-accent="on"');
    expect(draw('technical-report-167')).not.toContain('data-accent');
  });
});
