// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { escapeBibtex, paperCitation, reportCitation, SITE_ORIGIN, type PaperCitationInput } from '@/lib/citation';
import { SITE_CONFIG } from '@/lib/constants';
import { readReportSections } from '@/lib/reports/content';
import { discoverReportsUnique } from '@/lib/reports/locator';
import { readReportMeta } from '@/lib/reports/meta';

// A citation states only what the site already states: the author, the
// catalog title, the TR label, the year of the stated or published date and
// the canonical URL for a report; the arXiv id and the venue wording shown on
// /papers for a public paper. A fact the data does not hold is left out of
// the entry, never guessed.

const ASCII = /^[\x20-\x7e\n]*$/;
const field = (bibtex: string, name: string) => new RegExp(`^  ${name}\\s+= (.+?),?$`, 'm').exec(bibtex)?.[1];

describe('BibTeX escaping', () => {
  it('escapes the characters BibTeX and TeX read as syntax', () => {
    expect(escapeBibtex('Cost & Energy: 100% of {GPU}_0 #1')).toBe(String.raw`Cost \& Energy: 100\% of \{GPU\}\_0 \#1`);
    expect(escapeBibtex('$5 ~ x^2 \\ y')).toBe(String.raw`\$5 \textasciitilde{} x\textasciicircum{}2 \textbackslash{} y`);
  });

  it('never escapes its own escapes', () => {
    expect(escapeBibtex('\\{')).toBe(String.raw`\textbackslash{}\{`);
  });

  it('writes typographic punctuation, symbols and Greek as TeX', () => {
    expect(escapeBibtex('Phase 1 — Foundation (TR108–TR116)')).toBe('Phase 1 --- Foundation (TR108--TR116)');
    expect(escapeBibtex('Chimera’s “safe” set')).toBe("Chimera's ``safe'' set");
    expect(escapeBibtex('Jailbreak × Quantization')).toBe(String.raw`Jailbreak $\times$ Quantization`);
    expect(escapeBibtex('κ = 0.87 ± 0.01, ρ ≥ η')).toBe(String.raw`$\kappa$ = 0.87 $\pm$ 0.01, $\rho$ $\geq$ $\eta$`);
  });

  it('writes accented Latin letters as TeX accents', () => {
    expect(escapeBibtex('Rényi, Gödel, façade, Dvořák, ñ')).toBe(String.raw`R{\'e}nyi, G{\"o}del, fa{\c{c}}ade, Dvo{\v{r}}{\'a}k, {\~n}`);
  });

  it('keeps a character it has no TeX for, rather than dropping it', () => {
    expect(escapeBibtex('量子 quantization')).toBe('量子 quantization');
  });
});

describe('report citation', () => {
  const tr134 = reportCitation({
    slug: 'technical-report-134',
    title: 'TR134: Alignment Robustness Under Quantization',
    date: '2026-03-06',
  });

  it('is a @techreport built from the catalog title, the TR label, the date and the canonical URL', () => {
    expect(tr134.bibtex).toBe(
      [
        '@techreport{kadadekar2026tr134,',
        '  author      = {Kadadekar, Sahil},',
        '  title       = {{Alignment Robustness Under Quantization}},',
        '  institution = {Chimeraforge},',
        '  number      = {TR134},',
        '  year        = {2026},',
        '  month       = mar,',
        '  url         = {https://chimeraforge.vercel.app/reports/technical-report-134}',
        '}',
      ].join('\n'),
    );
    expect(tr134.key).toBe('kadadekar2026tr134');
  });

  it('reads the same facts as a plain-text citation', () => {
    expect(tr134.text).toBe(
      'Sahil Kadadekar. "Alignment Robustness Under Quantization." Technical Report TR134, Chimeraforge, 2026. https://chimeraforge.vercel.app/reports/technical-report-134',
    );
  });

  it('names the author and the institution from the site config, and the origin the report manifest uses', () => {
    expect(tr134.text.startsWith(`${SITE_CONFIG.AUTHOR}. `)).toBe(true);
    expect(field(tr134.bibtex, 'institution')).toBe(`{${SITE_CONFIG.NAME}}`);
    const manifest = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'reports.json', 'route.ts'), 'utf8');
    expect(manifest).toContain(`const BASE = '${SITE_ORIGIN}';`);
  });

  it('keeps a versioned report its own number and key', () => {
    const v3 = reportCitation({
      slug: 'technical-report-164-v3',
      title: 'TR164 V3: Cross-Backend Serving-Stack Boundary Matrix (vLLM vs SGLang)',
      date: '2026-06-15',
    });
    expect(v3.key).toBe('kadadekar2026tr164v3');
    expect(field(v3.bibtex, 'number')).toBe('{TR164 V3}');
    expect(field(v3.bibtex, 'title')).toBe('{{Cross-Backend Serving-Stack Boundary Matrix (vLLM vs SGLang)}}');
  });

  it('leaves out the number of a document that has no TR label', () => {
    const paper = reportCitation({
      slug: 'technical-report-conclusive-phase1-whitepaper',
      title: 'Phase 1 Decision Whitepaper',
      date: '2025-12-01',
    });
    expect(paper.bibtex).not.toMatch(/^\s+number\s+=/m);
    expect(paper.key).toBe('kadadekar2025conclusivephase1whitepaper');
    expect(paper.text).toBe(
      'Sahil Kadadekar. "Phase 1 Decision Whitepaper." Technical report, Chimeraforge, 2025. https://chimeraforge.vercel.app/reports/technical-report-conclusive-phase1-whitepaper',
    );
  });

  it('leaves out the year and month of a report with no date, rather than guessing one', () => {
    for (const date of [null, undefined, 'soon', '2026-13-40']) {
      const undated = reportCitation({ slug: 'gemma3', title: 'Gemma 3 Benchmark Report', date });
      expect(undated.bibtex).not.toMatch(/^\s+(?:year|month)\s+=/m);
      expect(undated.key).toBe('kadadekar-gemma3');
      expect(undated.text).toBe('Sahil Kadadekar. "Gemma 3 Benchmark Report." Technical report, Chimeraforge. https://chimeraforge.vercel.app/reports/gemma3');
    }
  });

  it('escapes the title and never the URL', () => {
    const cited = reportCitation({ slug: 'technical-report-119', title: 'TR119: Cost & Energy Analysis', date: '2025-12-21' });
    expect(field(cited.bibtex, 'title')).toBe(String.raw`{{Cost \& Energy Analysis}}`);
    expect(field(cited.bibtex, 'url')).toBe('{https://chimeraforge.vercel.app/reports/technical-report-119}');
    // the plain text is not TeX
    expect(cited.text).toContain('"Cost & Energy Analysis."');
  });
});

describe('every report on the site', () => {
  it('has a unique, stable key and an all-ASCII entry dated from its own title block or its publication date', async () => {
    const slugs = discoverReportsUnique().map((entry) => entry.slug);
    // a moved report root must fail loudly rather than pass an empty scan
    expect(slugs.length).toBeGreaterThan(50);
    const keys = new Map<string, string>();
    for (const slug of slugs) {
      const meta = readReportMeta(slug);
      const [primary] = await readReportSections(slug);
      const date = primary?.frontMatter?.date ?? meta?.published ?? null;
      const cited = reportCitation({ slug, title: meta!.title!, date });

      expect(cited.key, slug).toMatch(/^kadadekar\d{4}[a-z0-9]+$/);
      expect(keys.get(cited.key), `${slug} shares ${cited.key}`).toBeUndefined();
      keys.set(cited.key, slug);
      expect(cited.bibtex, slug).toMatch(ASCII);
      expect(field(cited.bibtex, 'year'), slug).toBe(`{${date!.slice(0, 4)}}`);
      expect(field(cited.bibtex, 'url'), slug).toBe(`{${SITE_ORIGIN}/reports/${slug}}`);
      // braces balance, so the entry parses
      expect(cited.bibtex.replace(/\\[{}]/g, '').split('{').length, slug).toBe(cited.bibtex.replace(/\\[{}]/g, '').split('}').length);
    }
  }, 120_000);
});

describe('paper citation', () => {
  const presented: PaperCitationInput = {
    title: 'A Paired Testing Protocol for Batch-Conditioned Refusal Robustness in LLM Serving',
    venue: 'ICML 2026 Workshop on Hypothesis Testing',
    status: 'Presented',
    arxiv: 'https://arxiv.org/abs/2605.27763',
  };
  const preprint: PaperCitationInput = {
    title: 'Quality Is Not a Safety Proxy Under Quantization',
    venue: 'Public preprint',
    status: 'Preprint',
    arxiv: 'https://arxiv.org/abs/2606.10154',
  };

  it('cites a workshop paper by its arXiv id and keeps the venue as the page words it', () => {
    const cited = paperCitation(presented)!;
    expect(cited.bibtex).toBe(
      [
        '@misc{kadadekar2026paired,',
        '  author        = {Kadadekar, Sahil},',
        '  title         = {{A Paired Testing Protocol for Batch-Conditioned Refusal Robustness in LLM Serving}},',
        '  year          = {2026},',
        '  eprint        = {2605.27763},',
        '  archivePrefix = {arXiv},',
        '  url           = {https://arxiv.org/abs/2605.27763},',
        '  note          = {Presented at the ICML 2026 Workshop on Hypothesis Testing}',
        '}',
      ].join('\n'),
    );
    expect(cited.text).toBe(
      'Sahil Kadadekar. "A Paired Testing Protocol for Batch-Conditioned Refusal Robustness in LLM Serving." arXiv:2605.27763, 2026. Presented at the ICML 2026 Workshop on Hypothesis Testing. https://arxiv.org/abs/2605.27763',
    );
  });

  it('words a paper not yet presented by its own status, never as presented', () => {
    const cited = paperCitation({
      title: 'A Safe Prototype Is Not a Safety Direction: Reference Dependence and Prompt Confounds in Response-Safety Embeddings',
      venue: 'NeurIPS 2026 Workshop on Foundations of Language Model Security',
      status: 'Accepted',
      arxiv: 'https://arxiv.org/abs/2610.01801',
    })!;
    expect(field(cited.bibtex, 'note')).toBe('{Accepted at the NeurIPS 2026 Workshop on Foundations of Language Model Security}');
    expect(cited.bibtex).not.toContain('Presented');
    expect(cited.key).toBe('kadadekar2026safe');
  });

  it('gives a preprint no venue', () => {
    const cited = paperCitation(preprint)!;
    expect(cited.bibtex).not.toMatch(/^\s+note\s+=/m);
    expect(cited.text).toBe('Sahil Kadadekar. "Quality Is Not a Safety Proxy Under Quantization." arXiv:2606.10154, 2026. https://arxiv.org/abs/2606.10154');
  });

  it('never states a DOI, pages, a booktitle or a journal', () => {
    for (const paper of [presented, preprint]) {
      expect(paperCitation(paper)!.bibtex).not.toMatch(/^\s+(?:doi|pages|booktitle|journal|volume|publisher)\s+=/m);
    }
  });

  it.each(['Synthesis', 'In preparation', 'Submitted', 'Under review', 'Revising'])('has no citation for a paper whose status is %s, even with a preprint link', (status) => {
    expect(paperCitation({ ...preprint, status })).toBeNull();
  });

  it('has no citation for a paper without an arXiv id it can read', () => {
    expect(paperCitation({ ...preprint, arxiv: undefined })).toBeNull();
    expect(paperCitation({ ...preprint, arxiv: 'https://example.com/paper.pdf' })).toBeNull();
    expect(paperCitation({ ...preprint, arxiv: 'https://arxiv.org/abs/cs/0112017' })).toBeNull();
  });
});
