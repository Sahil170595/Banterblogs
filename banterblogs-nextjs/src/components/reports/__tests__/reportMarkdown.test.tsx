import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { readReportSections, renderReportDocument, type ReportSection } from '@/lib/reports/content';
import { REVEAL_WRAPPER_CLASS, ReportMarkdown } from '../ReportMarkdown';

// ReportMarkdown renders a report body block by block, so tables, code blocks
// and figures can rise into view through <Reveal> while prose, lists and
// headings never move. The markup stays the pipeline's markup, element for
// element: typography's sibling rules (h2 + *, first and last child) still see
// the same siblings.

// tables (TR138), code and a mermaid block (TR110), lists and a dropped
// contents table (TR152), a status lede and source lists (TR164 V5)
const SAMPLE = ['technical-report-138', 'technical-report-110', 'technical-report-152', 'technical-report-164-v5'];

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const markupOf = (section: ReportSection) => renderToStaticMarkup(<ReportMarkdown sections={[section]} />);

// the pipeline's body, one outerHTML per top-level element
function pipelineElements(section: ReportSection): string[] {
  return [...parse(`<body>${section.html}</body>`).body.children].map((el) => el.outerHTML);
}

// the rendered body with each reveal's own wrapper and state removed
function renderedElements(section: ReportSection): string[] {
  const prose = parse(markupOf(section)).querySelector('.report-prose')!;
  return [...prose.children].map((el) => {
    const block = el.classList.contains(REVEAL_WRAPPER_CLASS) ? el.firstElementChild! : el;
    block.removeAttribute('data-reveal');
    return block.outerHTML;
  });
}

describe('report body blocks', () => {
  const sections = new Map<string, ReportSection>();

  beforeAll(async () => {
    for (const slug of SAMPLE) sections.set(slug, (await readReportSections(slug))[0]);
  }, 60_000);

  it.each(SAMPLE)('renders %s element for element as the pipeline wrote it', (slug) => {
    const section = sections.get(slug)!;
    const expected = pipelineElements(section);

    expect(expected.length).toBeGreaterThan(20);
    expect(renderedElements(section)).toEqual(expected);
  });

  it.each(SAMPLE)('reveals every table and code block in %s, and nothing else', (slug) => {
    const section = sections.get(slug)!;
    const body = parse(markupOf(section)).querySelector('.report-prose')!;
    const reveals = [...body.querySelectorAll('[data-reveal]')];

    for (const el of reveals) {
      const isTable = el.classList.contains('table-scroll') && el.firstElementChild?.tagName === 'TABLE';
      const isCode = el.classList.contains(REVEAL_WRAPPER_CLASS) && el.firstElementChild?.tagName === 'PRE';
      expect(isTable || isCode, el.outerHTML.slice(0, 80)).toBe(true);
      // a reveal is a top-level block, never something inside prose
      expect(el.parentElement).toBe(body);
    }
    const tables = body.querySelectorAll('.table-scroll').length;
    const code = body.querySelectorAll('pre').length;
    expect(tables + code).toBeGreaterThan(0);
    expect(reveals).toHaveLength(tables + code);
    expect(body.querySelectorAll(':is(p, li, ul, ol, blockquote, h2, h3, h4, h5, h6)[data-reveal]')).toHaveLength(0);
  });

  it('reveals a figure (a paragraph holding only an image) inside its own wrapper', async () => {
    const { html, headings, blocks } = await renderReportDocument('Text before.\n\n![A plot](https://example.com/plot.png)\n\nText after.');
    const markup = renderToStaticMarkup(<ReportMarkdown sections={[{ id: 'doc', title: 'Doc', html, markdown: '', sourceLabel: '', originKey: 'doc', headings, blocks, frontMatter: null }]} />);
    const body = parse(markup).querySelector('.report-prose')!;

    expect(blocks.map((block) => block.reveal)).toEqual([null, 'figure', null]);
    const [figure] = body.querySelectorAll('[data-reveal]');
    expect(figure.className).toBe(REVEAL_WRAPPER_CLASS);
    expect(figure.querySelector('p > img')?.getAttribute('src')).toBe('https://example.com/plot.png');
  });

  it('keeps each section an article with its id around the reading surface', () => {
    const section = sections.get('technical-report-138')!;
    const article = parse(markupOf(section)).querySelector('article');

    expect(article?.id).toBe(section.id);
    expect(article?.firstElementChild?.classList.contains('report-prose')).toBe(true);
  });
});
