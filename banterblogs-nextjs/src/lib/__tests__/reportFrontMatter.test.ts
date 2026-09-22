import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { extractHeadings, MIN_TOC_HEADINGS } from '../episodes';
import { discoverReportsUnique, type ReportLocation } from '../reports/locator';
import {
  parseStatedDate,
  prepareReportMarkdown,
  readReportSections,
  renderReportDocument,
  type RenderedReport,
  type ReportFrontMatter,
  type ReportSection,
} from '../reports/content';

// The report page renders a report's title, description and metadata in its
// own head, so the rendering pipeline folds the document's title block (its
// h1, subtitles and leading metadata) out of the body and hands it over as
// data. The rule was read off the real reports in PublishReady/reports/:
// - the title block runs from the leading h1 to the author's first thematic
//   break, or to an earlier section heading;
// - the h1, the subtitle headings and the leading key/value metadata (a
//   "Field | Value" table, or two or more "**Label:** value" lines) fold;
// - anything else in the title block (a status note, a blockquote, a lede)
//   stays at the top of the body, in order, with the break after it;
// - a heading right after the break that heads only a higher-rank heading is
//   an orphan subtitle (TR110, TR113) and folds too.
// Nothing folded is lost: the page shows it in the head or its details panel.

const doc = (...lines: string[]) => lines.join('\n');
const fold = (markdown: string) => renderReportDocument(markdown, { foldTitleBlock: true });
const texts = (items: Array<{ text: string }>) => items.map((item) => item.text);

describe('title block folding rules', () => {
  it('folds the title, its subtitle, a Field | Value table and the break that closes them', async () => {
    const { html, frontMatter } = await fold(
      doc(
        '# Technical Report 9: A Title',
        '## A subtitle',
        '',
        '| Field | Value |',
        '|---|---|',
        '| **Date** | 2026-01-02 |',
        '| **Run** | `abc` |',
        '',
        '---',
        '',
        '## Executive Summary',
        '',
        'Body text.',
      ),
    );

    expect(frontMatter?.title.text).toBe('Technical Report 9: A Title');
    expect(texts(frontMatter!.subtitles)).toEqual(['A subtitle']);
    expect(frontMatter!.fields.map((f) => [f.label, f.html])).toEqual([
      ['Date', '2026-01-02'],
      ['Run', '<code>abc</code>'],
    ]);
    expect(frontMatter!.date).toBe('2026-01-02');
    expect(html.trimStart()).toMatch(/^<h2 id="executive-summary">Executive Summary<\/h2>/);
    expect(html).not.toMatch(/<hr>|Field|A subtitle|Technical Report 9/);
  });

  it.each([
    ['hard', '  '],
    ['soft', ''],
  ])('folds bold "Label:" lines (%s line breaks) as metadata, one field per line', async (_kind, lineEnd) => {
    const { html, frontMatter } = await fold(
      doc(
        '# Baseline Report',
        '',
        `**Date:** September 30, 2025${lineEnd}`,
        `**Model:** llama3.1:8b${lineEnd}`,
        '**Related:** [TR108](/reports/technical-report-108)',
        '',
        '---',
        '',
        '## Executive Summary',
        '',
        'Text.',
      ),
    );

    expect(frontMatter!.fields.map((f) => [f.label, f.text])).toEqual([
      ['Date', 'September 30, 2025'],
      ['Model', 'llama3.1:8b'],
      ['Related', 'TR108'],
    ]);
    expect(frontMatter!.fields[2].html).toBe('<a href="/reports/technical-report-108">TR108</a>');
    expect(frontMatter!.date).toBe('2025-09-30');
    expect(html.trimStart()).toMatch(/^<h2 id="executive-summary">/);
  });

  it('keeps a single labelled paragraph as prose: a status note, not metadata', async () => {
    const { html, frontMatter } = await fold(
      doc('# TR164 V4: A Surface', '', '**Status:** Complete and hand-narrated.', '', '**The thesis.** One sentence.', '', '---', '', '## Overview', '', 'Text.'),
    );

    expect(frontMatter!.fields).toEqual([]);
    expect(frontMatter!.subtitles).toEqual([]);
    expect(html.trimStart()).toMatch(/^<p><strong>Status:<\/strong> Complete and hand-narrated\.<\/p>/);
    // the break now separates that lede from the body, so it stays
    expect(html).toMatch(/<\/p>\s*<hr>\s*<h2 id="overview">/);
  });

  it('keeps a status box in the title block, and folds the subtitle the author closed off with a break', async () => {
    const { html, frontMatter } = await fold(
      doc('# TR167: A Title', '', '## A long subtitle', '', '> **Status box.** Run complete.', '', '---', '', '## 1. Abstract', '', 'Text.'),
    );

    expect(texts(frontMatter!.subtitles)).toEqual(['A long subtitle']);
    expect(html.trimStart()).toMatch(/^<blockquote>/);
    expect(html).toMatch(/<\/blockquote>\s*<hr>\s*<h2 id="1-abstract">/);
  });

  it('keeps a heading above prose when no break closes the title block: it opens a section', async () => {
    const { html, headings, frontMatter } = await fold(doc('# A Title', '', '## Abstract', '', 'Some text.', '', '## Methods', '', 'More.'));

    expect(frontMatter!.subtitles).toEqual([]);
    expect(html.trimStart()).toMatch(/^<h2 id="abstract">Abstract<\/h2>/);
    expect(headings.map((h) => h.id)).toEqual(['abstract', 'methods']);
  });

  it('folds a subtitle that heads only the metadata, even without a closing break', async () => {
    const { html, frontMatter } = await fold(
      doc('# A Title', '## Subtitle', '| Field | Value |', '|---|---|', '| **Date** | 2026-02-03 |', '', '## Executive Summary', '', 'Text.'),
    );

    expect(texts(frontMatter!.subtitles)).toEqual(['Subtitle']);
    expect(frontMatter!.fields).toHaveLength(1);
    expect(html.trimStart()).toMatch(/^<h2 id="executive-summary">/);
  });

  it('folds an orphan heading after the break, one that heads nothing but a higher-rank heading', async () => {
    const { html, headings, frontMatter } = await fold(
      doc(
        '# Technical Report 110',
        '## Concurrent Multi-Agent Performance',
        '',
        '| Field | Value |',
        '|---|---|',
        '| **TR Number** | 110 |',
        '',
        '---',
        '',
        '### Systematic Evaluation',
        '',
        '## Executive Summary',
        '',
        'Text.',
      ),
    );

    expect(texts(frontMatter!.subtitles)).toEqual(['Concurrent Multi-Agent Performance', 'Systematic Evaluation']);
    expect(html.trimStart()).toMatch(/^<h2 id="executive-summary">/);
    expect(headings.map((h) => h.id)).toEqual(['executive-summary']);
  });

  it('leaves a run of same-rank headings after the break alone', async () => {
    const { html } = await fold(
      doc('# A Title', '', '| Field | Value |', '|---|---|', '| **Date** | 2026-01-01 |', '', '---', '', '## Part I', '', '## 1. Intro', '', 'Text.'),
    );

    expect(html.trimStart()).toMatch(/^<h2 id="part-i">Part I<\/h2>/);
  });

  it('folds nothing when the document does not open with a title', async () => {
    const { html, frontMatter } = await fold(doc('## Summary', '', '| Field | Value |', '|---|---|', '| a | b |'));

    expect(frontMatter).toBeNull();
    expect(html).toContain('<th>Field</th>');
  });

  it('keeps a table that is data, not metadata (its header is not Field | Value)', async () => {
    const { html, frontMatter } = await fold(doc('# A Title', '', '| Model | Score |', '|---|---|', '| a | 1 |', '', '---', '', '## Results', '', 'Text.'));

    expect(frontMatter!.fields).toEqual([]);
    expect(html.trimStart()).toMatch(/^<div class="table-scroll"[^>]*><table>/);
    expect(html).toMatch(/<\/div>\s*<hr>\s*<h2 id="results">/);
  });

  // the scroll boxes are named regions (re-judge P1-8): the names count the
  // tables a reader meets, so a folded metadata table takes no number
  it('numbers the body tables from 1 once the metadata table has folded away', async () => {
    const { html } = await fold(
      doc('# A Title', '', '| Field | Value |', '|---|---|', '| **Date** | 2026-01-01 |', '', '---', '', '## Results', '', '| Model | Score |', '|---|---|', '| a | 1 |', '', '| Model | Rate |', '|---|---|', '| b | 2 |'),
    );
    const host = document.createElement('div');
    host.innerHTML = html;
    expect([...host.querySelectorAll('.table-scroll')].map((box) => box.getAttribute('aria-label'))).toEqual(['Table 1', 'Table 2']);
  });

  it('names a later section’s tables after it, so region names stay unique on a page of several documents', async () => {
    const { html } = await renderReportDocument(doc('# Appendix', '', '| Model | Score |', '|---|---|', '| a | 1 |'), { tableRegionName: 'Appendix' });
    expect(html).toContain('aria-label="Appendix, table 1"');
  });

  it('keeps metadata that follows prose', async () => {
    const { html, frontMatter } = await fold(
      doc('# A Title', '', 'Intro paragraph.', '', '| Field | Value |', '|---|---|', '| **Date** | 2026-01-01 |', '', '---', '', '## Body', '', 'Text.'),
    );

    expect(frontMatter!.fields).toEqual([]);
    expect(frontMatter!.date).toBeNull();
    expect(html).toContain('Intro paragraph.');
    expect(html).toContain('<th>Field</th>');
  });

  it('leaves the document whole when folding is off', async () => {
    const markdown = doc('# A Title', '## Subtitle', '', '| Field | Value |', '|---|---|', '| **Date** | 2026-01-01 |', '', '---', '', '## Body', '', 'Text.');
    const { html, frontMatter } = await renderReportDocument(markdown);

    expect(frontMatter).toBeNull();
    expect(html).toMatch(/<h2 id="a-title" data-demoted>A Title<\/h2>/);
    expect(html).toContain('<th>Field</th>');
  });
});

describe('stated dates', () => {
  it.each([
    ['2026-03-15', '2026-03-15'],
    ['October 10, 2025', '2025-10-10'],
    ['October 2-3, 2025', '2025-10-02'],
    ['2026-02-20 (Phase 1: Feb 18, Phase 2: Feb 20, Phase 3: Feb 20)', '2026-02-20'],
    ['2026-05-12 / 2026-05-13', '2026-05-12'],
    ['2026-05-24 run, report written after TR138 v2', '2026-05-24'],
    ['see the run manifest', null],
    ['2026-13-40', null],
    ['February 30, 2026', null],
  ])('reads %j as %j', (value, expected) => {
    expect(parseStatedDate(value)).toBe(expected);
  });

  it('prefers the Date field, falls back to another "… date" field, and ignores Last Updated', async () => {
    const withBoth = await fold(doc('# T', '', '**Last Updated:** October 10, 2025  ', '**Date:** September 30, 2025', '', '---', '', '## A', '', 'x'));
    expect(withBoth.frontMatter!.date).toBe('2025-09-30');
    const addendum = await fold(doc('# T', '', '| Field | Value |', '|---|---|', '| Addendum date | 2026-05-24 run |', '', '---', '', '## A', '', 'x'));
    expect(addendum.frontMatter!.date).toBe('2026-05-24');
    const updatedOnly = await fold(doc('# T', '', '**Last Updated:** October 10, 2025  ', '**Model:** x', '', '---', '', '## A', '', 'x'));
    expect(updatedOnly.frontMatter!.date).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The real reports

interface Expected {
  title: RegExp;
  subtitles: number;
  fields: number;
  date: string | null;
  // the body's first element: its tag and the start of its text
  first: [string, string];
}

const EXPECTED: Record<string, Expected> = {
  'technical-report-138': {
    title: /^Technical Report 138 v2: Batch Inference Safety Under Non-Determinism -- Strengthened-Evidence Revision$/,
    subtitles: 1,
    fields: 15,
    date: '2026-03-15',
    first: ['h2', 'Positioning'],
  },
  'technical-report-108': { title: /^Technical Report 108: /, subtitles: 1, fields: 7, date: '2025-10-08', first: ['h2', 'Executive Summary'] },
  'technical-report-110': { title: /^Technical Report 110$/, subtitles: 2, fields: 7, date: '2025-10-10', first: ['h2', 'Executive Summary'] },
  'technical-report-113': { title: /^Technical Report 113$/, subtitles: 2, fields: 7, date: '2025-11-12', first: ['h2', 'Executive Summary'] },
  'technical-report-117': { title: /^Technical Report 117: /, subtitles: 0, fields: 5, date: '2025-12-08', first: ['h2', 'Executive Summary'] },
  'technical-report-137': { title: /^Technical Report 137: /, subtitles: 1, fields: 10, date: '2026-03-08', first: ['p', 'TR134 established'] },
  'technical-report-138-study-d-addendum': { title: /^Technical Report 138 Study D Addendum: /, subtitles: 1, fields: 10, date: '2026-05-24', first: ['h2', '1. Executive Result'] },
  'technical-report-152': { title: /^Technical Report 152: /, subtitles: 0, fields: 0, date: null, first: ['p', 'Phase 5 / bridge-paper Layer 5'] },
  'technical-report-163': { title: /^Technical Report 163: /, subtitles: 1, fields: 0, date: null, first: ['p', 'Status.'] },
  'technical-report-164': { title: /^Technical Report 164: /, subtitles: 1, fields: 0, date: null, first: ['h2', '1. Abstract'] },
  'technical-report-164-v4': { title: /^Technical Report 164 V4: /, subtitles: 0, fields: 0, date: null, first: ['p', 'Status:'] },
  'technical-report-165': { title: /^Technical Report 165: /, subtitles: 1, fields: 0, date: null, first: ['p', 'Status.'] },
  'technical-report-167': { title: /^Technical Report 167: /, subtitles: 1, fields: 0, date: null, first: ['blockquote', 'Status box.'] },
  'ollama-benchmark-report': { title: /^Ollama LLM Benchmark Report: /, subtitles: 0, fields: 6, date: '2025-09-30', first: ['h2', 'Executive Summary'] },
  'performance-deep-dive': { title: /^Performance Deep Dive: /, subtitles: 0, fields: 5, date: '2025-10-02', first: ['h2', 'Executive Summary'] },
  gemma3: { title: /^Gemma3 Performance Benchmark Report$/, subtitles: 0, fields: 6, date: '2025-10-08', first: ['h2', 'Executive Summary'] },
  'technical-report-conclusive-phase6': { title: /^Technical Report — Conclusive Synthesis, Phase 6$/, subtitles: 1, fields: 5, date: null, first: ['h2', 'Abstract'] },
  'technical-report-conclusive-phase6-extended-appendices': { title: /Extended Appendices$/, subtitles: 1, fields: 0, date: null, first: ['p', 'This file is the appendix companion'] },
  'technical-report-conclusive-phase1-whitepaper': { title: /^TR108-TR116 Decision Whitepaper$/, subtitles: 1, fields: 7, date: '2025-12-28', first: ['h2', 'Abstract'] },
};

// rehype-stringify's character references, back to text
function decode(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&(amp|lt|gt|quot|nbsp);/g, (_, name: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ' })[name]!);
}
const plain = (html: string) => decode(html.replace(/<[^>]+>/g, ' '));
// a label's colon is punctuation, not content: "Date:" folds to the label "Date"
function wordCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of text.split(/\s+/).map((w) => w.replace(/:$/, '')).filter(Boolean)) counts.set(word, (counts.get(word) ?? 0) + 1);
  return counts;
}
// the one structural label a folded metadata table drops: its column header
const TABLE_HEADER_WORDS = new Set(['Field', 'Value']);

// The head of a report's markdown that holds its whole title block: through
// the first thematic break, then two more headings (room for an orphan
// subtitle and the first section), fences skipped. Rendering only this keeps
// the corpus-wide checks fast; the region's fold is checked against the full one.
const REGION_HEADINGS_AFTER_BREAK = 2;
function titleRegion(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let fenced = false;
  let broken = false;
  let headings = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    if (!broken && /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line) && i > 0 && !lines[i - 1].trim()) broken = true;
    else if (broken && /^#{1,6}\s/.test(line) && ++headings > REGION_HEADINGS_AFTER_BREAK) return lines.slice(0, i).join('\n');
  }
  return markdown;
}

function firstElement(html: string): [string, string] {
  const open = /^\s*<([a-z0-9]+)[^>]*>/.exec(html);
  if (!open) return ['', ''];
  if (['hr', 'br', 'img'].includes(open[1])) return [open[1], ''];
  const match = /^\s*<([a-z0-9]+)[^>]*>([\s\S]*?)<\/\1>/.exec(html);
  return match ? [match[1], plain(match[2]).trim()] : [open[1], ''];
}

const summary = (fm: ReportFrontMatter | null) =>
  JSON.stringify([fm?.title.text, texts(fm?.subtitles ?? []), fm?.fields.map((f) => [f.label, f.text]), fm?.date]);
const ownContents = (markdown: string) => ({ dropInlineToc: extractHeadings(markdown).length >= MIN_TOC_HEADINGS });

// a report entry's primary document: the file itself, or the one markdown file in its directory
function primaryMarkdown(entry: ReportLocation): string {
  if (entry.kind === 'file') return fs.readFileSync(entry.path, 'utf8');
  const files = fs.readdirSync(entry.path).filter((name) => /\.md$/i.test(name));
  // a multi-document report would need the pipeline's primary-file rule here
  expect(files, entry.slug).toHaveLength(1);
  return fs.readFileSync(path.join(entry.path, files[0]), 'utf8');
}

describe('title block folding on the real reports', () => {
  const entries = discoverReportsUnique().sort((a, b) => a.slug.localeCompare(b.slug));
  const slugs = entries.map((entry) => entry.slug);
  // every report's title region, folded and not
  const regions = new Map<string, { folded: RenderedReport; unfolded: RenderedReport }>();

  beforeAll(async () => {
    for (const entry of entries) {
      const markdown = primaryMarkdown(entry);
      const region = prepareReportMarkdown(titleRegion(markdown));
      regions.set(entry.slug, {
        folded: await renderReportDocument(region, { ...ownContents(markdown), foldTitleBlock: true }),
        unfolded: await renderReportDocument(region, ownContents(markdown)),
      });
    }
  });

  const folded = (slug: string) => regions.get(slug)!.folded;

  it('reads every report pinned below', () => {
    for (const slug of Object.keys(EXPECTED)) expect(slugs, slug).toContain(slug);
  });

  it.each(Object.entries(EXPECTED))('folds %s as its file states it', (slug, expected) => {
    const { frontMatter, html } = folded(slug);

    expect(frontMatter?.title.text).toMatch(expected.title);
    expect(frontMatter!.subtitles, 'subtitles').toHaveLength(expected.subtitles);
    expect(frontMatter!.fields, 'fields').toHaveLength(expected.fields);
    expect(frontMatter!.date).toBe(expected.date);
    const [tag, text] = firstElement(html);
    expect(tag).toBe(expected.first[0]);
    expect(text.startsWith(expected.first[1]), `${slug} body opens with "${text.slice(0, 60)}"`).toBe(true);
  });

  it('finds a title block in every report: each one opens with its h1', () => {
    expect(slugs.filter((slug) => !folded(slug).frontMatter)).toEqual([]);
  });

  it('never opens a report body with a restated title', () => {
    const restated: Record<string, string> = {};
    for (const slug of slugs) {
      const { html, frontMatter } = folded(slug);
      // later "# " headings in a body stay demoted section headings; the first block is never the title
      if (/^\s*<h2[^>]*\sdata-demoted/.test(html)) restated[slug] = 'demoted title';
      const [tag, text] = firstElement(html);
      if (/^h\d$/.test(tag) && [frontMatter!.title.text, ...texts(frontMatter!.subtitles)].includes(text)) restated[slug] = text;
    }
    expect(restated).toEqual({});
  });

  it('leaves the folded headings out of the contents', () => {
    const listed: Record<string, string[]> = {};
    for (const slug of slugs) {
      const { headings, frontMatter } = folded(slug);
      const subtitles = new Set(texts(frontMatter!.subtitles));
      const both = headings.filter((heading) => subtitles.has(heading.text)).map((heading) => heading.text);
      if (both.length) listed[slug] = both;
    }
    expect(listed).toEqual({});
  });

  it('loses nothing: every word of the unfolded report is in the body or the head, bar the Field | Value header', () => {
    const lostBySlug: Record<string, string[]> = {};
    for (const slug of slugs) {
      const { folded: fold, unfolded } = regions.get(slug)!;
      const kept = wordCounts(
        [
          plain(fold.html),
          fold.frontMatter!.title.text,
          ...texts(fold.frontMatter!.subtitles),
          ...fold.frontMatter!.fields.flatMap((field) => [field.label, plain(field.html)]),
        ].join(' '),
      );
      const lost = [...wordCounts(plain(unfolded.html))]
        .filter(([word, count]) => (kept.get(word) ?? 0) < count && !TABLE_HEADER_WORDS.has(word))
        .map(([word]) => word);
      if (lost.length) lostBySlug[slug] = lost;
    }
    expect(lostBySlug).toEqual({});
  });
});

// Whole reports through the page's pipeline, one per title-block shape that
// carries a markdown contents: a Field | Value table (TR138), a provenance
// line and blockquote (TR152), and an addendum (Study D).
describe('title block folding through the report pipeline', () => {
  const FULL = ['technical-report-138', 'technical-report-152', 'technical-report-138-study-d-addendum'];
  const sections = new Map<string, ReportSection>();

  beforeAll(async () => {
    for (const slug of FULL) sections.set(slug, (await readReportSections(slug))[0]);
  }, 60_000);

  it.each(FULL)('folds %s whole exactly as its title region does', async (slug) => {
    const section = sections.get(slug)!;
    const region = await renderReportDocument(prepareReportMarkdown(titleRegion(section.markdown)), {
      ...ownContents(section.markdown),
      foldTitleBlock: true,
    });

    expect(summary(section.frontMatter)).toBe(summary(region.frontMatter));
    expect(firstElement(section.html)).toEqual(firstElement(region.html));
  });

  it.each(FULL)('anchors every %s contents entry in its body, and shows its own contents where the markdown one was dropped', (slug) => {
    const { html, headings, markdown } = sections.get(slug)!;

    for (const heading of headings) expect(html, `#${heading.id}`).toContain(`id="${heading.id}"`);
    expect(ownContents(markdown).dropInlineToc).toBe(true);
    expect(html).not.toMatch(/>(\d+\.\s*)?Table of Contents</i);
    expect(headings.length).toBeGreaterThanOrEqual(MIN_TOC_HEADINGS);
  });

  it('keeps TR138 contents pointing at the same anchors, without the folded subtitle', () => {
    const section = sections.get('technical-report-138')!;
    const before = extractHeadings(section.markdown);

    expect(before[0].text).toMatch(/^Audit-layer flip adjudication/);
    expect(section.headings.map((h) => h.id)).toEqual(before.slice(1).map((h) => h.id));
    expect(section.headings[0].text).toBe('Positioning');
  });
});
