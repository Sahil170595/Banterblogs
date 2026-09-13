import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { extractHeadings, MIN_TOC_HEADINGS } from '@/lib/episodes';
import { prepareReportMarkdown, readReportSections, renderReportDocument, type ReportSection } from '@/lib/reports/content';
import { ReportMarkdown } from '../ReportMarkdown';

// ReportMarkdown renders a report body as one server HTML string, so React
// hydrates its one container and nothing inside it. The pipeline marks the
// reveal targets on the server (data-reveal="" on table scroll boxes, code
// blocks and figures) and RevealScope arms them; prose, lists and headings are
// never targets.

// tables (TR138), code and a mermaid block (TR110), lists and a dropped
// contents table (TR152), a status lede and source lists (TR164 V5)
const SAMPLE = ['technical-report-138', 'technical-report-110', 'technical-report-152', 'technical-report-164-v5'];
const REST_MARKER = / data-reveal=""/g;
const TARGET_TAGS = new Set(['DIV', 'PRE', 'FIGURE', 'IMG']);

const parse = (html: string) => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
const markupOf = (section: ReportSection) => renderToStaticMarkup(<ReportMarkdown sections={[section]} />);

describe('report body', () => {
  const sections = new Map<string, ReportSection>();

  beforeAll(async () => {
    for (const slug of SAMPLE) sections.set(slug, (await readReportSections(slug))[0]);
  }, 60_000);

  it.each(SAMPLE)('renders %s as one element holding the pipeline HTML byte for byte', (slug) => {
    const section = sections.get(slug)!;
    const markup = markupOf(section);

    expect(markup).toContain(`<div class="report-prose prose prose-invert">${section.html}</div>`);
    expect(parse(markup).querySelector('article')?.id).toBe(section.id);
  });

  it.each(SAMPLE)('marks %s at rest on its tables and code blocks, and changes nothing else', async (slug) => {
    const section = sections.get(slug)!;
    const unmarked = await renderReportDocument(prepareReportMarkdown(section.markdown), {
      foldTitleBlock: true,
      dropInlineToc: extractHeadings(section.markdown).length >= MIN_TOC_HEADINGS,
    });

    // take the markers out and the pipeline's own HTML is left
    expect(section.html.replace(REST_MARKER, '')).toBe(unmarked.html);
    // the server never writes a reveal state, only the rest marker
    expect(section.html).not.toMatch(/data-reveal="(?!")/);
  });

  it.each(SAMPLE)('makes every table and code block in %s a target, and nothing else', (slug) => {
    const body = parse(sections.get(slug)!.html);
    const targets = [...body.querySelectorAll('[data-reveal]')];

    for (const el of targets) {
      const isTable = el.tagName === 'DIV' && el.classList.contains('table-scroll') && el.firstElementChild?.tagName === 'TABLE';
      expect(isTable || TARGET_TAGS.has(el.tagName), el.outerHTML.slice(0, 80)).toBe(true);
      if (el.tagName === 'DIV') expect(isTable).toBe(true);
    }
    const tables = body.querySelectorAll('.table-scroll').length;
    const code = body.querySelectorAll('pre').length;
    expect(tables + code).toBeGreaterThan(0);
    expect(targets).toHaveLength(tables + code);
    expect(body.querySelectorAll(':is(p, li, ul, ol, blockquote, h2, h3, h4, h5, h6)[data-reveal]')).toHaveLength(0);
  });

  it('marks a standing image (a markdown figure) and not the paragraph around it', async () => {
    const { html } = await renderReportDocument('Text before.\n\n![A plot](https://example.com/plot.png)\n\nText after.', { markRevealTargets: true });
    const body = parse(html);

    expect(body.querySelector('p > img')?.getAttribute('data-reveal')).toBe('');
    expect(body.querySelectorAll('p[data-reveal]')).toHaveLength(0);
  });

  it('marks nothing unless asked: episodes and other markdown pages keep their markup', async () => {
    const { html } = await renderReportDocument('| a |\n|---|\n| 1 |\n\n```\ncode\n```');

    expect(html).not.toContain('data-reveal');
  });
});
