import type { ReactNode, ViewTransitionProps } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ReportDetail from '@/app/reports/[id]/page';
import { computeContentStats } from '@/lib/episodes';
import { readReportSections } from '@/lib/reports/content';
import { readReportMeta } from '@/lib/reports/meta';
import { formatStatedDate } from '../ReportHead';
import { reportIdentity } from '../reportIdentity';
import { NAV_BACK } from '../ReportTransitions';

// The report page head (Phase R2, B11): breadcrumb, one title, the catalog
// description as a dek, a meta row (TR number, phase, read time, stated date),
// the rest of the report's own title block behind a closed disclosure, and the
// hero figure. The body opens on its first section, never on a restated title.

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children }: ViewTransitionProps) => actual.createElement(actual.Fragment, null, children),
  };
});

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ transitionTypes, children, ...props }: { transitionTypes?: string[]; children?: ReactNode }) =>
      createElement('a', { ...props, 'data-transition-types': transitionTypes?.join(' ') }, children),
  };
});

class QuietObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', QuietObserver);
});

afterEach(cleanup);

async function page(id: string) {
  return render(await ReportDetail({ params: Promise.resolve({ id }) })).container;
}
const textOf = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const crumbs = (root: Element) =>
  [...root.querySelectorAll('nav[aria-label="Breadcrumb"] a')].map((a) => [textOf(a), a.getAttribute('href'), a.getAttribute('data-transition-types')]);
const metaRow = (root: Element) => [...root.querySelectorAll('.report-meta li')].map(textOf);

describe('report page head', () => {
  it('opens TR138 with a breadcrumb, one title, the dek and a meta row with its computed read time and stated date', async () => {
    const root = await page('technical-report-138');
    const [section] = await readReportSections('technical-report-138');
    const minutes = computeContentStats(section.html).readingTime;

    expect(crumbs(root)).toEqual([
      ['Research archive', '/reports', NAV_BACK],
      ['Phase 5 · Attack Surface', '/reports?phase=phase5', NAV_BACK],
    ]);
    expect([...root.querySelectorAll('h1')].map(textOf)).toEqual(['Batch Inference Safety Under Non-Determinism']);
    expect(textOf(root.querySelector('.report-dek'))).toBe(readReportMeta('technical-report-138')?.description);
    expect(minutes).toBeGreaterThan(10);
    expect(metaRow(root)).toEqual(['TR138', 'Phase 5', `${minutes} min read`, 'Mar 15, 2026']);
    expect(root.querySelector('.report-meta time')?.getAttribute('datetime')).toBe('2026-03-15');
  });

  it('keeps everything else the title block said behind one closed disclosure', async () => {
    const root = await page('technical-report-138');
    const details = root.querySelector<HTMLDetailsElement>('details.report-details')!;
    const panel = details.querySelector('.report-details-panel')!;

    expect(details.open).toBe(false);
    expect(textOf(details.querySelector('summary'))).toBe('Report details');
    expect(textOf(panel.querySelector('.report-details-title'))).toBe(
      'Technical Report 138 v2: Batch Inference Safety Under Non-Determinism -- Strengthened-Evidence Revision',
    );
    expect(textOf(panel)).toContain('Audit-layer flip adjudication + 7,257-sample reduced replication');
    const labels = [...panel.querySelectorAll('dt')].map(textOf);
    expect(labels).toHaveLength(15);
    expect(labels.slice(0, 5)).toEqual(['TR Number', 'Date', 'Version', 'Author', 'Git Commit']);
    expect(panel.querySelectorAll('dd')).toHaveLength(15);
    expect(panel.querySelector('dd code')?.textContent).toBe('edbaf196');
  });

  it('opens the body on its first section and shows one title heading above it', async () => {
    const root = await page('technical-report-138');
    const body = root.querySelector('.report-prose')!;

    expect(body.firstElementChild?.tagName).toBe('H2');
    expect(body.firstElementChild?.id).toBe('positioning');
    expect([...body.querySelectorAll('h1, h2, h3')].filter((h) => /^Technical Report 138|^Audit-layer flip/.test(textOf(h)))).toEqual([]);
    const beforeBody = [...root.querySelectorAll('h1, h2, h3')].filter((h) => h.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(beforeBody.map((h) => h.tagName)).toEqual(['H1']);
  });

  it('shows the hero figure: the card visual with its ember accent lit', async () => {
    const root = await page('technical-report-138');
    const visuals = root.querySelectorAll('.report-hero svg[data-family]');

    expect(visuals).toHaveLength(1);
    expect(visuals[0].getAttribute('data-accent')).toBe('on');
    expect(visuals[0].getAttribute('aria-hidden')).toBe('true');
  });

  it.each([
    ['technical-report-conclusive-phase1-whitepaper', ['Whitepaper', 'Phase 1'], 'Phase 1 · Foundation', 'Dec 28, 2025', 7],
    ['ollama-benchmark-report', ['Baseline', 'Phase 0'], 'Phase 0 · Pre-TR Baselines', 'Sep 30, 2025', 6],
  ])('labels %s by what it is, and dates it as it states', async (id, label, crumb, date, fields) => {
    const root = await page(id);

    expect(metaRow(root).slice(0, 2)).toEqual(label);
    expect(metaRow(root).at(-1)).toBe(date);
    expect(crumbs(root)[1][0]).toBe(crumb);
    expect(root.querySelectorAll('.report-details-panel dt')).toHaveLength(fields);
  });

  it('shows no date where the report states none, and its details hold only its title', async () => {
    const root = await page('technical-report-164-v4');

    expect(root.querySelector('.report-meta time')).toBeNull();
    expect(metaRow(root).slice(0, 2)).toEqual(['TR164 V4', 'Phase 8']);
    expect(root.querySelector('.report-details-panel dl')).toBeNull();
    expect(textOf(root.querySelector('.report-details-title'))).toMatch(/^Technical Report 164 V4: /);
  });
});

// R4 layout: at 1440 the column ran x=112-736 with the contents at x=1088
// (352px of dead space), and the hero drawing filled a quarter of a 1216px
// plate. The head, the article column and the contents rail now sit in one
// centred frame; the hero opens the article column, so the rail starts level
// with it, and the plate is the drawing's own 16:9.
describe('report page layout', () => {
  const column = (root: Element) => root.querySelector('.report-frame .report-layout')!.children[0];

  it('sets the head, the article column and the contents rail in one reading frame', async () => {
    const root = await page('technical-report-138');
    const frame = root.querySelector('.report-frame')!;
    expect(frame.querySelector('.report-head h1')).not.toBeNull();
    const [article, rail] = [...frame.querySelector('.report-layout')!.children];
    expect(article.querySelector('.report-prose')).not.toBeNull();
    expect(rail.matches('nav.report-toc')).toBe(true);
    expect(frame.querySelector('nav.report-pager')).not.toBeNull();
  });

  it('opens the article column on the hero, then the phone contents, then the body', async () => {
    const root = await page('technical-report-138');
    const [hero, mobileToc, body] = ['.report-hero', '.report-toc-mobile', '.report-prose'].map((selector) => column(root).querySelector(selector)!);
    expect(column(root).firstElementChild).toBe(hero);
    expect(hero.compareDocumentPosition(mobileToc) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mobileToc.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // one hero, still the far end of the figure morph (ReportFigureTransition wraps it)
    expect(root.querySelectorAll('.report-hero')).toHaveLength(1);
  });
});

describe('report identity', () => {
  it.each([
    ['technical-report-138', 'TR138: Batch Inference Safety Under Non-Determinism', 'Batch Inference Safety Under Non-Determinism', 'TR138', 'phase5', 'Attack Surface'],
    ['technical-report-164-v3', 'TR164 V3: Cross-Backend Serving Physics', 'Cross-Backend Serving Physics', 'TR164 V3', 'phase8', 'Serving-Stack Mechanism Isolation'],
    ['technical-report-conclusive-phase6', 'Conclusive Report: Phase 6', 'Conclusive Report: Phase 6', 'Conclusive report', 'phase6', 'Serving-State Safety Certification'],
    ['gemma3', 'Gemma 3 Benchmark Report', 'Gemma 3 Benchmark Report', 'Baseline', 'phase0', 'Pre-TR Baselines'],
  ])('reads %s', (slug, title, heading, label, phaseKey, phaseName) => {
    expect(reportIdentity(slug, title)).toEqual({ heading, label, phase: { key: phaseKey, number: phaseKey.slice(5), name: phaseName } });
  });

  it('formats a stated date the same in every time zone', () => {
    expect(formatStatedDate('2026-03-15')).toBe('Mar 15, 2026');
    expect(formatStatedDate('2025-01-01')).toBe('Jan 1, 2025');
  });
});
