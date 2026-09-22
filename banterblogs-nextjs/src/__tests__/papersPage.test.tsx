import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import PapersPage from '@/app/papers/page';
import { ENTRANCE_GROUP_CLASS, ENTRANCE_ITEM_ATTRIBUTE, HEAD_ENTRANCE_GROUPS } from '@/components/motion/entrance';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';

// /papers is the proof page for the R3 primitives (A5): an unboxed PageHeader
// with the tally in its stat row, each paper a Card with its status Badge,
// venue line and ButtonLinks, withheld submissions a counted row, reveals on
// the lists and hover depth on the linked papers. The owner's copy survives
// sentence for sentence.

// Every sentence of main's /papers prose (de0922c), verbatim.
const OWNER_PROSE = [
  'Independent research on inference optimization, constitutional AI architectures, and empirical safety evaluation.',
  'The first paper was presented at the ICML 2026 Workshop on Hypothesis Testing, and the speculative-decoding null result is public on arXiv; 8 more are under blind review at top ML venues and workshops, with 6 in preparation.',
  `Each is backed by reproducible technical reports and artifact-level provenance from a ${MEASUREMENTS.DISPLAY} measurement program.`,
  'The ICML 2026 workshop paper was accepted 2026-05-22 and presented at the workshop — the first peer-reviewed paper from the program.',
  'The speculative-decoding null result is a public arXiv preprint.',
  '8 papers submitted with PDFs, artifact manifests, and venue checklists complete.',
  'Now under blind review at top ML venues and workshops.',
  'Plus 5 workshop submissions under double-blind review.',
  'Their titles are withheld until decisions land.',
  'Synthesis papers and methodology work derived from the published technical report archive, plus papers withdrawn from review and being revised for resubmission.',
  `${REPORTS.DISPLAY} technical reports with ${MEASUREMENTS.DISPLAY} measurements — the evidence layer behind these papers.`,
  'Experience, education, and the engineering that surrounds the research.',
  'The constitutional AI ecosystem these findings are built into.',
];
const ARXIV = ['https://arxiv.org/abs/2605.27763', 'https://arxiv.org/abs/2606.25097', 'https://arxiv.org/abs/2606.10154'];
const DEMO = 'https://huggingface.co/spaces/build-small-hackathon/quantsafe-certifier';
// every evidence link on main, in order
const EVIDENCE = [138, 144, 125, 134, 142, 140, 139, 134, 135, 136, 137, 123, 127, 133, 112, 114, 115, 145, 164, 130, 132, 126, 147];
const LISTED_PAPERS = 11;
// the presented paper and the public preprint
const PUBLISHED = 2;
const UNDER_REVIEW_ROWS = 3;
const IN_PREP_ROWS = 6;
const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;

let page: HTMLElement;
let markup: string;
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

beforeAll(() => {
  markup = renderToStaticMarkup(<PapersPage />);
});
// testing-library unmounts after every test, so each test mounts its own
beforeEach(() => {
  page = render(<PapersPage />).container;
});

describe('papers head', () => {
  it('titles the page "Papers" and moves the tally out of the h1 into the stat row, with the total and the measurements', () => {
    const h1s = page.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe('Papers');
    const stats = page.querySelector('ul[aria-label="The papers in numbers"]')!;
    expect([...stats.querySelectorAll('li')].map(text)).toEqual([
      '1 presented',
      '1 public preprint',
      '8 under peer review',
      '16 papers total',
      `${MEASUREMENTS.SHORT} measurements`,
    ]);
    expect(text(page)).toContain('Author: Sahil Kadadekar · Independent research');
  });

  it('keeps every sentence of the owner copy', () => {
    const all = text(page);
    for (const sentence of OWNER_PROSE) expect(all, sentence).toContain(sentence);
  });

  it('opens on the header entrance, then the first papers join the sequence; the section head, the largest text, paints at once', () => {
    const groups = [...page.querySelectorAll<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)].map((g) => g.style.getPropertyValue('--group'));
    expect(groups).toEqual(['0', '1', '2']);
    // a delayed fade from 0 is credited to LCP only when it ends (~1.1s measured), and the
    // first section's description is the page's LCP element, so it never joins the entrance
    const firstHead = page.querySelector('#published-heading')!.parentElement!;
    expect(firstHead.closest(`.${ENTRANCE_GROUP_CLASS}, [${ENTRANCE_ITEM_ATTRIBUTE}]`)).toBeNull();
    const items = [...page.querySelectorAll<HTMLElement>(`[${ENTRANCE_ITEM_ATTRIBUTE}]`)];
    expect(items).toHaveLength(2);
    for (const item of items) expect(item.style.getPropertyValue('--entrance-items-after')).toBe(String(HEAD_ENTRANCE_GROUPS));
    expect(items.map((item) => item.querySelector('article')?.querySelector('h3')?.textContent)).toEqual([
      'A Paired Testing Protocol for Batch-Conditioned Refusal Robustness in LLM Serving',
      'Typical-Acceptance Invariance Screen for Speculative Decoding Safety',
    ]);
  });
});

describe('papers', () => {
  it('lists every paper with its status badge and venue line, and never a withheld title', () => {
    const articles = [...page.querySelectorAll('article')];
    expect(articles).toHaveLength(LISTED_PAPERS);
    const badges = articles.map((article) => article.querySelector('.text-label-12-mono.rounded-full'));
    expect(badges.every(Boolean)).toBe(true);
    const tones = Object.fromEntries(badges.map((badge) => [text(badge!), badge!.className.match(/text-(status-\w+|foreground\/80)/)?.[1]]));
    expect(tones).toEqual({
      Presented: 'status-green',
      Preprint: 'status-blue',
      Submitted: 'status-amber',
      Synthesis: 'foreground/80',
      'In preparation': 'foreground/80',
    });
    expect(text(articles[0])).toContain('ICML 2026 Workshop on Hypothesis Testing');
  });

  it('keeps the arXiv, demo and evidence links, as buttons', () => {
    const hrefs = [...page.querySelectorAll('main a, a')].map((a) => a.getAttribute('href'));
    for (const arxiv of ARXIV) expect(hrefs, arxiv).toContain(arxiv);
    expect(hrefs).toContain(DEMO);
    const evidence = hrefs.filter((href) => href?.startsWith('/reports/technical-report-')).map((href) => Number(href!.slice(-3)));
    expect(evidence).toEqual(EVIDENCE);
    for (const href of ['/reports', '/work', '/platform']) expect(hrefs).toContain(href);
    // a title that leads to its preprint is the card's or row's own link; every other link is a button
    for (const button of page.querySelectorAll(`a[href^="https://arxiv.org"]:not(.card-link):not(.row-link), a[href="${DEMO}"], a[href^="/reports/technical-report-"]`)) {
      expect(button.className.split(/\s+/)).toEqual(expect.arrayContaining(['pressable', 'rounded-full']));
    }
  });

  // R4 design re-judge: 10 of 12 cards were text-only boxes of uneven height,
  // one of them filler. Cards stay only where there is a picture.
  it('keeps cards for the two public papers only, each with its evidence report picture, its title leading to the preprint', () => {
    const cards = [...page.querySelectorAll('article.card-depth')];
    expect(cards).toHaveLength(PUBLISHED);
    expect(cards.map((card) => card.querySelector('h3 a.card-link')?.getAttribute('href'))).toEqual(ARXIV.slice(0, PUBLISHED));
    for (const card of cards) expect(card.querySelector('svg.rv')).not.toBeNull();
    const surfaces = [...page.querySelectorAll('.card-surface')];
    expect(surfaces).toHaveLength(PUBLISHED);
    expect(surfaces.every((surface) => surface.querySelector('svg.rv'))).toBe(true);
  });

  it('sets the papers under review and in preparation as numbered hairline rows, the title leading to a preprint where there is one', () => {
    for (const [section, count] of [['#under-review', UNDER_REVIEW_ROWS], ['#in-preparation', IN_PREP_ROWS]] as const) {
      const rows = [...page.querySelectorAll(`${section} article.list-row`)];
      expect(rows, section).toHaveLength(count);
      expect(rows.map((row) => text(row.querySelector('.font-mono')!)), section).toEqual(Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0')));
    }
    const rowLinks = [...page.querySelectorAll('article.list-row h3 a.row-link')].map((a) => a.getAttribute('href'));
    expect(rowLinks).toEqual(ARXIV.slice(PUBLISHED));
  });

  it('counts the withheld submissions in the section description, never as a card or a title', () => {
    const description = page.querySelector('#under-review-heading')!.parentElement!;
    expect(text(description)).toContain('Plus 5 workshop submissions under double-blind review. Their titles are withheld until decisions land.');
    expect([...page.querySelectorAll('.card-surface, article')].filter((el) => /workshop submissions/.test(text(el)))).toEqual([]);
  });

  it('closes on one quiet onward line: the three links with their reasons, no cards and no ember', () => {
    const onward = page.querySelector('nav[aria-label="Onward"]')!;
    expect([...onward.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/reports', '/work', '/platform']);
    expect(onward.querySelector('.card-surface, .card-depth')).toBeNull();
    expect(onward.innerHTML).not.toMatch(/text-primary/);
  });

  it('reveals the lists as they scroll in', () => {
    expect(page.querySelectorAll('li[data-reveal]').length).toBeGreaterThanOrEqual(LISTED_PAPERS);
  });

  // re-judge P1-7: at 320 the demo button's min-content widened the one
  // implicit (auto) column, and every card with it, to 310px in 288
  // R4: the papers grid and the onward line are the page's two list grids; the
  // paper rows size their body column with minmax(0,1fr) the same way
  it('sizes every card grid’s phone column to the screen, never to its widest card', () => {
    const grids = [...page.querySelectorAll('ul.grid')];
    expect(grids.length).toBeGreaterThanOrEqual(2);
    for (const grid of grids) expect(grid.className.split(/\s+/)).toContain('grid-cols-1');
    const rows = [...page.querySelectorAll('article.list-row')];
    expect(rows).toHaveLength(UNDER_REVIEW_ROWS + IN_PREP_ROWS);
    for (const row of rows) expect(row.className).toContain('grid-cols-[auto_minmax(0,1fr)]');
  });

  it('draws no boxed panels: no signal classes, and borders only on the hairline buttons', () => {
    expect(markup).not.toMatch(/signal-(panel|pill|divider)/);
    const bordered = [...page.querySelectorAll('*')].filter((el) => [...el.classList].some((c) => BORDER_WIDTH.test(c)));
    expect(bordered.every((el) => el.classList.contains('pressable'))).toBe(true);
    expect(bordered.length).toBeLessThanOrEqual(4);
  });
});
