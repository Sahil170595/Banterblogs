import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { discoverReportsUnique } from '@/lib/reports/locator';
import { PHASE_DEFINITIONS, classifyReportSlug, phaseWhitepaperSlug, type PhaseKey } from '@/lib/reports/phases';
import { MAX_VISUAL_BYTES, ReportVisual, VISUAL_FAMILIES, visualStyleFor } from '../ReportVisual';

const draw = (slug: string, accent = false) => renderToStaticMarkup(<ReportVisual slug={slug} accent={accent} />);
// a phase with this many reports fills at least a row of the grid, so its
// pictures must not repeat one composition
const MIN_REPORTS_FOR_VARIETY = 5;
const MIN_LAYOUTS_PER_PHASE = 3;
// dither dots are drawn as square-capped strokes one dot pitch wide
const DOT_STROKE_WIDTH = 8;
// shortest repeat of a dash pattern, in viewBox units
const MIN_DASH_PERIOD = 4;

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

  it('varies the composition inside a phase, so a row of one phase never repeats one picture', () => {
    const byPhase = new Map<string, string[]>();
    for (const { slug } of discoverReportsUnique()) {
      const phase = classifyReportSlug(slug);
      if (!/^phase\d+$/.test(phase)) continue;
      byPhase.set(phase, [...(byPhase.get(phase) ?? []), slug]);
    }
    const layoutOf = (slug: string) => /data-layout="([^"]+)"/.exec(draw(slug))?.[1];
    for (const [phase, slugs] of byPhase) {
      if (slugs.length < MIN_REPORTS_FOR_VARIETY) continue;
      const layouts = new Set(slugs.map(layoutOf));
      expect(layouts.has(undefined), phase).toBe(false);
      expect(layouts.size, `${phase}: ${[...layouts].join(',')}`).toBeGreaterThanOrEqual(MIN_LAYOUTS_PER_PHASE);
    }
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

  it('never draws thick or finely dashed strokes, which rasterize slowly as a row of cards scrolls in', () => {
    // a thick dashed tick ring cost a 50ms GPU raster on the first scroll
    for (const slug of [...discoverReportsUnique().map((entry) => entry.slug), 'compendium']) {
      const svg = draw(slug);
      // only the dither dots carry their own stroke width (one dot pitch)
      for (const [, width] of svg.matchAll(/stroke-width="([^"]+)"/g)) expect(width, slug).toBe(String(DOT_STROKE_WIDTH));
      for (const [, dashes] of svg.matchAll(/stroke-dasharray="([^"]+)"/g)) {
        const period = dashes.split(/[\s,]+/).map(Number).reduce((sum, part) => sum + part, 0);
        expect(period, `${slug}: ${dashes}`).toBeGreaterThanOrEqual(MIN_DASH_PERIOD);
      }
    }
  });

  it('uses the ember accent only where asked', () => {
    expect(draw('technical-report-167', true)).toContain('data-accent="on"');
    expect(draw('technical-report-167')).not.toContain('data-accent');
  });

  // /platform draws each repository with this generator, seeded by its name:
  // a name carries no phase, so the page names the family itself.
  it('draws the family a caller names, the seed still picking the composition', () => {
    const named = (seed: string, family: (typeof VISUAL_FAMILIES)[number], variant?: 0 | 1) =>
      renderToStaticMarkup(<ReportVisual slug={seed} family={family} variant={variant} />);
    for (const family of VISUAL_FAMILIES) {
      for (const variant of [0, 1] as const) {
        const svg = named('banterpacks', family, variant);
        expect(svg, `${family} ${variant}`).toContain(`data-family="${family}"`);
        expect(svg, `${family} ${variant}`).toBe(named('banterpacks', family, variant));
        expect(svg.length, `${family} ${variant}`).toBeLessThanOrEqual(MAX_VISUAL_BYTES);
        expect(svg, `${family} ${variant}`).not.toMatch(/\sid="|NaN|Infinity/);
      }
    }
    expect(named('banterpacks', 'arcs')).not.toBe(named('banterhearts', 'arcs'));
    // a named family replaces only the phase's pick: a report slug keeps its synthesis marks
    expect(renderToStaticMarkup(<ReportVisual slug="compendium" family="dots" />)).toContain('data-synthesis="true"');
    // and without one, a report draws exactly as before
    expect(renderToStaticMarkup(<ReportVisual slug="technical-report-138" family={undefined} />)).toBe(draw('technical-report-138'));
  });
});
