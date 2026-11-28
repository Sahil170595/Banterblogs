// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { discoverReportsUnique } from '@/lib/reports/locator';
import { classifyReportSlug } from '@/lib/reports/phases';
import { readReportSections } from '@/lib/reports/content';
import { readReportMarkdown, reportFigure, reportFigureThumbnails, resolveSpec } from '../index';
import { extractTables, FigureSpecError, plainText, resolveFigure } from '../resolve';
import { FIGURE_SPECS, REPORTS_WITHOUT_FIGURE } from '../specs';

// Every figure on the site is a spec resolved against the report it belongs
// to. These run each spec against the markdown on disk, so a report sync that
// renames a heading, drops a column or rewords the quoted sentence fails here
// (and in the build) rather than drawing a stale chart.

const TECHNICAL = discoverReportsUnique()
  .map((entry) => entry.slug)
  .filter((slug) => /^phase\d+$/.test(classifyReportSlug(slug)));
/** technical reports on disk; the archive's own count */
const TECHNICAL_REPORTS = 55;
/** reports drawn with a real figure; raise it as specs are added */
const FIGURES = 47;
// renders every anchored report through the full markdown pipeline
const ANCHOR_CHECK_TIMEOUT_MS = 120_000;

describe('figure specs', () => {
  it('covers 47 of the 55 technical reports, and accounts for every one it leaves out', () => {
    expect(TECHNICAL).toHaveLength(TECHNICAL_REPORTS);
    expect(FIGURE_SPECS).toHaveLength(FIGURES);
    const covered = new Set(FIGURE_SPECS.map((spec) => spec.slug));
    expect(covered.size, 'one figure per report').toBe(FIGURE_SPECS.length);
    expect(TECHNICAL.filter((slug) => !covered.has(slug)).sort()).toEqual(Object.keys(REPORTS_WITHOUT_FIGURE).sort());
    for (const slug of covered) expect(TECHNICAL, slug).toContain(slug);
  });

  it.each(FIGURE_SPECS.map((spec) => [spec.slug, spec] as const))('%s resolves to a table in its own report, with a number in every cell drawn', (_slug, spec) => {
    const figure = resolveSpec(spec);
    expect(figure.rows.length).toBeGreaterThanOrEqual(2);
    for (const row of figure.rows) {
      expect(row.label, 'a row label').not.toBe('');
      for (const value of row.values) {
        expect(Number.isFinite(value.value), `${row.label}: ${value.text}`).toBe(true);
        expect(value.text).toMatch(/\d/);
      }
      if (figure.chart === 'dot') {
        expect(Number.isFinite(row.low) && Number.isFinite(row.high), `${row.label}: interval`).toBe(true);
        expect(row.low!).toBeLessThanOrEqual(row.high!);
      }
    }
    expect(figure.rows[figure.highlight]).toBeDefined();
    // the caption is the report's own sentence, and names no venue under review
    expect(figure.claim.length).toBeGreaterThan(20);
    expect(figure.claim).not.toMatch(/\b(?:NeurIPS|ICLR|ICML|EMNLP|ACL|TMLR|OpenReview|submission)\b/i);
  });

  it.each(FIGURE_SPECS.map((spec) => [spec.slug, spec] as const))('%s fails loudly when its table, a column or its sentence leaves the report', (_slug, spec) => {
    const markdown = readReportMarkdown(spec.slug)!;
    const table = extractTables(markdown).filter((candidate) => candidate.heading === spec.table.heading)[spec.table.nth ?? 0];
    const lines = markdown.split(/\r?\n/);

    // the table is cut out of the report
    const withoutTable = [...lines.slice(0, table.line - 1), ...lines.slice(table.line + 1 + table.rows.length)].join('\n');
    expect(() => resolveFigure(spec, withoutTable), 'table removed').toThrow(FigureSpecError);

    // its heading is reworded
    const reworded = markdown.split(spec.table.heading).join(`${spec.table.heading} (revised)`);
    if (reworded !== markdown) expect(() => resolveFigure(spec, reworded), 'heading reworded').toThrow(FigureSpecError);

    // the report is there but says nothing
    expect(() => resolveFigure(spec, '# Empty\n'), 'empty report').toThrow(/no table under the heading/);
  });

  it('points each figure at the heading it came from, where the report page has an id for it', () => {
    const anchored = FIGURE_SPECS.map((spec) => reportFigure(spec.slug)!).filter((figure) => figure.anchor);
    // most tables sit under a heading the page's contents rail can link
    expect(anchored.length).toBeGreaterThan(FIGURE_SPECS.length / 2);
    for (const figure of anchored) expect(figure.anchor).toMatch(/^[a-z0-9][\w-]*$/);
  });

  // the hero caption links #anchor: it must land on the heading the reader sees
  it('points every anchor at a heading the rendered report page carries, worded as the figure title', { timeout: ANCHOR_CHECK_TIMEOUT_MS }, async () => {
    for (const spec of FIGURE_SPECS) {
      const figure = reportFigure(spec.slug)!;
      if (!figure.anchor) continue;
      const html = (await readReportSections(spec.slug)).map((section) => section.html).join('\n');
      const heading = new RegExp(`<h[1-6][^>]*\\sid="${figure.anchor}"[^>]*>([\\s\\S]*?)</h[1-6]>`).exec(html);
      expect(heading, `${spec.slug}: #${figure.anchor}`).not.toBeNull();
      expect(plainText(heading![1].replace(/<[^>]+>/g, '')), spec.slug).toBe(figure.title);
    }
  });

  it('gives the archive a thumbnail per figure, without the caption sentence', () => {
    const thumbnails = reportFigureThumbnails();
    expect(Object.keys(thumbnails).sort()).toEqual(FIGURE_SPECS.map((spec) => spec.slug).sort());
    for (const thumbnail of Object.values(thumbnails)) {
      expect(thumbnail).not.toHaveProperty('claim');
      expect(thumbnail).not.toHaveProperty('anchor');
    }
    expect(reportFigure('technical-report-109')).toBeNull();
    expect(reportFigure('technical-report-conclusive-phase1')).toBeNull();
  });
});
