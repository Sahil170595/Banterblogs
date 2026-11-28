import { beforeAll, describe, expect, it } from 'vitest';
import { computeContentStats, extractHeadings, extractHtmlHeadings, MIN_TOC_HEADINGS, renderMarkdownTree } from '@/lib/episodes';
import { prepareReportMarkdown, readReportSections, renderReportDocument, type ReportSection } from '@/lib/reports/content';
import { addHeadingAnchors, HEADING_ANCHOR_CLASS, HEADING_ANCHOR_LABEL } from '@/lib/reports/headingAnchors';

// Every h2 and h3 of a report body ends in a link to itself, written by the
// pipeline so it is in the server HTML. The link holds no text of its own
// (its "#" is drawn by reading.css), so the contents, the reading time and
// anything else that reads a heading's text read what they read before.

const LONG_REPORT = 'technical-report-142';
const DOC = [
  '# The Title',
  '',
  '## Results',
  '',
  'Words of the section.',
  '',
  '### Per-model `refusal` rates',
  '',
  '#### A detail',
  '',
  '## See [TR134](/reports/technical-report-134)',
  '',
  '```md',
  '## not a heading',
  '```',
].join('\n');

const parse = (html: string) => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
const anchorsIn = (root: Element) => [...root.querySelectorAll<HTMLAnchorElement>(`a.${HEADING_ANCHOR_CLASS}`)];

describe('heading anchors', () => {
  it('ends every h2 and h3 in one link to itself', async () => {
    const { html } = await renderReportDocument(DOC, { headingAnchors: true });
    const body = parse(html);

    expect(html).toContain('<h2 id="results">Results<a class="heading-anchor" href="#results" aria-label="Link to this section"></a></h2>');
    const anchored = [...body.querySelectorAll('h2, h3')];
    expect(anchored.map((heading) => heading.id)).toEqual(['the-title', 'results', 'per-model-refusal-rates', 'see-tr134']);
    for (const heading of anchored) {
      const anchors = anchorsIn(heading);
      expect(anchors, heading.id).toHaveLength(1);
      expect(anchors[0]).toBe(heading.lastElementChild);
      expect(anchors[0].getAttribute('href')).toBe(`#${heading.id}`);
    }
  });

  // The anchor sits inside its heading (the contents scroll-spy needs every
  // heading a direct child of the body), so its name is read as part of the
  // heading's. A name that repeated the heading's text would say every
  // section twice to a reader moving by headings; the contents list already
  // links each section by name.
  it('names the anchor in a few words that never repeat the heading', async () => {
    const body = parse((await renderReportDocument(DOC, { headingAnchors: true })).html);

    expect(HEADING_ANCHOR_LABEL).toBe('Link to this section');
    expect(new Set(anchorsIn(body).map((a) => a.getAttribute('aria-label')))).toEqual(new Set([HEADING_ANCHOR_LABEL]));
  });

  it('leaves deeper headings and code alone', async () => {
    const body = parse((await renderReportDocument(DOC, { headingAnchors: true })).html);

    expect(anchorsIn(body.querySelector('h4')!)).toHaveLength(0);
    expect(anchorsIn(body.querySelector('pre')!)).toHaveLength(0);
    expect(anchorsIn(body)).toHaveLength(4);
  });

  it('never nests a link in a link: a heading that holds one gets its anchor beside it', async () => {
    const body = parse((await renderReportDocument(DOC, { headingAnchors: true })).html);

    expect(body.querySelectorAll('a a')).toHaveLength(0);
    expect(body.querySelector('#see-tr134 > a[href="/reports/technical-report-134"] + a.heading-anchor')).not.toBeNull();
  });

  it('adds no text: the contents, the headings read from the HTML and the reading time are unchanged', async () => {
    const plain = await renderReportDocument(DOC);
    const anchored = await renderReportDocument(DOC, { headingAnchors: true });

    expect(anchored.headings).toEqual(plain.headings);
    expect(anchored.headings.map((h) => h.text)).toEqual(['Results', 'Per-model refusal rates', 'A detail', 'See TR134']);
    expect(extractHtmlHeadings(anchored.html)).toEqual(extractHtmlHeadings(plain.html));
    expect(computeContentStats(anchored.html).wordCount).toBe(computeContentStats(plain.html).wordCount);
    for (const anchor of anchorsIn(parse(anchored.html))) expect(anchor.textContent).toBe('');
    expect(parse(anchored.html).textContent).toBe(parse(plain.html).textContent);
  });

  it('is written only when asked: episodes and other markdown pages keep their markup', async () => {
    expect((await renderReportDocument(DOC)).html).not.toContain(HEADING_ANCHOR_CLASS);
  });

  it('keeps the folded title block free of anchors', async () => {
    const { html, frontMatter } = await renderReportDocument('# The Title\n\n**Date:** 2026-03-06\n**Model:** x\n\n---\n\n## Results\n\nBody.', {
      foldTitleBlock: true,
      headingAnchors: true,
    });

    expect(frontMatter?.title.html).toBe('The Title');
    expect(anchorsIn(parse(html))).toHaveLength(1);
  });

  it('skips a heading without an id, and adds nothing the second time', async () => {
    const tree = await renderMarkdownTree('## One\n\n## Two');
    const [first] = tree.children.filter((node) => node.type === 'element');
    if (first.type === 'element') delete first.properties.id;

    addHeadingAnchors(tree);
    addHeadingAnchors(tree);

    const anchors = JSON.stringify(tree).match(new RegExp(HEADING_ANCHOR_CLASS, 'g')) ?? [];
    expect(anchors).toHaveLength(1);
  });
});

describe(`heading anchors on ${LONG_REPORT}`, () => {
  let section: ReportSection;

  beforeAll(async () => {
    [section] = await readReportSections(LONG_REPORT);
  }, 60_000);

  it('anchors every h2 and h3 of the body once, each at its own id', () => {
    const body = parse(section.html);
    const headings = [...body.querySelectorAll('h2, h3')];

    expect(headings.length).toBeGreaterThan(MIN_TOC_HEADINGS);
    expect(anchorsIn(body)).toHaveLength(headings.length);
    for (const heading of headings) {
      expect(heading.id, heading.textContent ?? '').not.toBe('');
      expect(anchorsIn(heading).map((a) => a.getAttribute('href'))).toEqual([`#${heading.id}`]);
    }
    // ids stay unique, so every anchor leads to one place
    expect(new Set(headings.map((h) => h.id)).size).toBe(headings.length);
  });

  it('keeps headings direct children of the body, where the contents scroll-spy reads them', () => {
    const body = parse(section.html);

    for (const entry of section.headings) expect(body.querySelector(`:scope > [id="${entry.id}"]`), entry.id).not.toBeNull();
  });

  it('leaves the contents as they were without anchors', async () => {
    const plain = await renderReportDocument(prepareReportMarkdown(section.markdown), {
      foldTitleBlock: true,
      dropInlineToc: extractHeadings(section.markdown).length >= MIN_TOC_HEADINGS,
      markRevealTargets: true,
    });

    expect(section.headings).toEqual(plain.headings);
    expect(section.headings.some((h) => h.text.includes(HEADING_ANCHOR_LABEL) || h.text.endsWith('#'))).toBe(false);
  });
});
