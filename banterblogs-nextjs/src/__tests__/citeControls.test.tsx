import fs from 'node:fs';
import path from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import PapersPage from '@/app/papers/page';
import { ReportCite } from '@/components/reports/ReportCite';
import { paperCitation, reportCitation } from '@/lib/citation';

// Where a citation is offered. A report offers its own at the end of the
// page. On /papers a cite control stands only on a public paper: accepted or
// presented at a workshop, or a public preprint. A paper in preparation or
// withheld is never offered for citation: it has no public form to cite, and
// naming one would break a later double-blind submission.

const PAGE_SOURCE = (file: string) => fs.readFileSync(path.join(process.cwd(), 'src', 'app', file), 'utf8');
// the public papers, in page order: the three cards, then the row
const PUBLIC_ARXIV = ['2605.27763', '2606.25097', '2606.10154', '2610.01801'];
const IN_PREP_ROWS = 8;
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

afterEach(cleanup);

describe('cite controls on /papers', () => {
  it('stands on every accepted paper and public preprint, and only there', () => {
    const page = render(<PapersPage />).container;
    const published = [...page.querySelectorAll('#published article')];
    const cited = [...page.querySelectorAll('details.more-details')];

    expect(published).toHaveLength(PUBLIC_ARXIV.length);
    expect(cited).toHaveLength(PUBLIC_ARXIV.length);
    for (const article of published) expect(article.querySelectorAll('details.more-details'), text(article.querySelector('h3'))).toHaveLength(1);
    expect(published.map((article) => /eprint\s+= \{([\d.]+)\}/.exec(article.querySelector('pre')!.textContent ?? '')?.[1])).toEqual(PUBLIC_ARXIV);
  });

  it('never stands on a paper in preparation, nor on the withheld ones', () => {
    const page = render(<PapersPage />).container;
    const section = page.querySelector('#in-preparation')!;

    expect(section.querySelectorAll('article')).toHaveLength(IN_PREP_ROWS);
    expect(section.querySelectorAll('details, pre')).toHaveLength(0);
    expect(text(section)).not.toMatch(/@misc|@inproceedings|@article|BibTeX|\bCite\b/);
    // the withheld count's own paragraph carries nothing but its sentence
    expect(text(page)).toContain('4 workshop papers revising after decisions; titles withheld.');
  });

  it('would refuse an in-preparation paper even if the page asked', () => {
    const source = PAGE_SOURCE('papers/page.tsx');
    const inPrep = /const IN_PREP: Paper\[\] = \[([\s\S]*?)\n\];/.exec(source)![1];
    const statuses = [...inPrep.matchAll(/status: '([^']+)'/g)].map((m) => m[1]);

    expect(statuses.length).toBe(IN_PREP_ROWS);
    for (const status of new Set(statuses)) {
      expect(paperCitation({ title: 'T', venue: 'V', status, arxiv: 'https://arxiv.org/abs/2606.10154' }), status).toBeNull();
    }
    // and the page never asks: the in-preparation rows are rendered without the cite flag
    const inPrepRows = /\{IN_PREP\.map\(([\s\S]*?)\)\)\}/.exec(source)![1];
    expect(inPrepRows).toContain('<PaperRow');
    expect(inPrepRows).not.toMatch(/\bcite\b/i);
  });

  it('words each venue as the page does: presented at the ICML workshop, the second by its own status, a preprint by none', () => {
    const page = render(<PapersPage />).container;
    const entries = [...page.querySelectorAll('#published article pre')].map((pre) => pre.textContent ?? '');
    const note = (entry: string) => /note\s+= \{(.+)\}/.exec(entry)?.[1];

    expect(entries.map(note)).toEqual([
      'Presented at the ICML 2026 Workshop on Hypothesis Testing',
      undefined,
      undefined,
      'Accepted at the NeurIPS 2026 Workshop on Foundations of Language Model Security',
    ]);
    for (const entry of entries) {
      expect(entry).toMatch(/^@misc\{kadadekar2026[a-z]+,/);
      expect(entry).toContain('archivePrefix = {arXiv}');
      expect(entry).not.toMatch(/\b(?:doi|pages|booktitle|journal)\s+=/);
    }
    expect(new Set(entries.map((entry) => /^@misc\{([^,]+),/.exec(entry)![1])).size).toBe(entries.length);
  });

  it('names each control for its paper, so four "Cite" disclosures read apart', () => {
    const page = render(<PapersPage />).container;
    const summaries = [...page.querySelectorAll('#published details > summary')].map(text);

    expect(new Set(summaries).size).toBe(PUBLIC_ARXIV.length);
    for (const summary of summaries) expect(summary).toMatch(/^Cite: \S/);
  });
});

describe('cite control on a report', () => {
  const INPUT = { slug: 'technical-report-134', title: 'TR134: Alignment Robustness Under Quantization', date: '2026-03-06' };

  it('offers the report’s own citation under a label that says so', () => {
    const { container } = render(<ReportCite {...INPUT} />);
    const cited = reportCitation(INPUT);

    expect(text(container.querySelector('summary'))).toBe(`Cite this report: ${INPUT.title}`);
    expect(container.querySelector('pre > code')?.textContent).toBe(cited.bibtex);
    expect(container.querySelector('details p')?.textContent).toBe(cited.text);
  });

  it('sits once on the report page, after the body’s end marker, dated from the title block or the publication date', () => {
    const source = PAGE_SOURCE('reports/[id]/page.tsx');

    expect(source.match(/<ReportCite\b/g)).toHaveLength(1);
    expect(source).toMatch(/<ReportEnd \/>\s*<ReportCite slug=\{id\} title=\{title\} date=\{frontMatter\?\.date \?\? meta\.published\} \/>/);
  });
});
