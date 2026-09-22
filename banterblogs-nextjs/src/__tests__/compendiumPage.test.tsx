import type { ReactElement, ViewTransitionProps } from 'react';
import { render } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CompendiumPage from '@/app/reports/compendium/page';
import { ENTRANCE_GROUP_CLASS } from '@/components/motion/entrance';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { readReportMeta } from '@/lib/reports/meta';

// Next's App Router bundles the React canary that exports ViewTransition; the
// npm React these tests run on is stable and has none.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children }: ViewTransitionProps) => actual.createElement(actual.Fragment, null, children),
  };
});
vi.mock('next/navigation', () => ({ notFound: vi.fn(), usePathname: () => '/reports/compendium' }));

// The compendium in the R2 reading register (Phase R3): the report page's
// breadcrumb, title, dek, meta row and folded title block, its hero figure
// (the far end of the archive card's morph), the reading type, the report
// contents, and the old sidebar's two notes kept whole after the body.

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
let element: ReactElement;
let page: HTMLElement;

beforeAll(async () => {
  element = await CompendiumPage();
});
beforeEach(() => {
  page = render(element).container;
});

describe('compendium head', () => {
  it('reads as a report: breadcrumb, the catalog title and dek, the meta row', () => {
    const meta = readReportMeta('compendium')!;
    const crumbs = page.querySelector('nav[aria-label="Breadcrumb"] .report-crumbs')!;
    expect([...crumbs.querySelectorAll('a')].map((a) => [a.getAttribute('href'), text(a)])).toEqual([['/reports', 'Research archive']]);
    const h1s = page.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].classList.contains('report-title')).toBe(true);
    expect(text(h1s[0])).toBe(meta.title);
    expect(text(page.querySelector('.report-dek')!)).toBe(meta.description);
    const row = text(page.querySelector('ul.report-meta')!);
    expect(row).toContain('Compendium');
    expect(row).toMatch(/\d+ min read/);
  });

  it('folds the document title block into the details, losing none of it', () => {
    const details = text(page.querySelector('details.report-details')!);
    for (const part of [
      'Chimeraforge: High-Performance LLM Agent Orchestration via Rust-Python Hybrid Architectures',
      'Chimeraforge Research Team',
      'November 2025',
      'TR108 - TR115 (v2)',
    ]) {
      expect(details, part).toContain(part);
    }
  });

  it('rises in three entrance groups, the breadcrumb and title first, and draws its hero figure', () => {
    const groups = [...page.querySelectorAll<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)];
    expect(groups.map((g) => g.style.getPropertyValue('--group'))).toEqual(['0', '1', '2']);
    expect(groups[0].querySelector('h1')).not.toBeNull();
    expect(page.querySelector('.report-hero svg.rv')).not.toBeNull();
  });
});

describe('compendium body', () => {
  it('sets the whitepaper in the reading type with reveals on its tables and code, and the report contents', () => {
    const body = page.querySelector('article .report-prose')!;
    expect(text(body)).toContain('Real-time gaming applications demand sub-200ms latency for dynamic character interactions');
    expect(body.querySelectorAll('[data-reveal]').length).toBeGreaterThan(0);
    expect(page.querySelector('nav.report-toc[aria-label="Table of contents"]')).not.toBeNull();
    expect(page.querySelector('details.report-toc-mobile')).not.toBeNull();
    expect(page.querySelector('.report-progress')).not.toBeNull();
    expect(page.querySelector('[data-report-end]')).not.toBeNull();
  });

  it('keeps the sidebar notes whole, with the link to the archive', () => {
    const all = text(page);
    for (const sentence of [
      'About this Paper',
      'This whitepaper synthesizes the foundational Phase 1 research (TR108-TR116) — the Rust vs. Python comparison that shaped the platform architecture.',
      'Published: November 2025 · Sahil Kadadekar',
      'Source Data',
      `Access all ${REPORTS.DISPLAY} technical reports, ${MEASUREMENTS.SHORT} measurements, and phase whitepapers.`,
    ]) {
      expect(all, sentence).toContain(sentence);
    }
    const archive = [...page.querySelectorAll('a[href="/reports"]')].find((a) => text(a).startsWith('View Technical Archives'));
    expect(archive).toBeDefined();
  });

  it('draws no boxes: one hairline over the notes, no glass', () => {
    expect(page.innerHTML).not.toMatch(/backdrop-blur|signal-(panel|pill|divider)/);
    const bordered = [...page.querySelectorAll('*')].filter((el) => [...el.classList].some((c) => BORDER_WIDTH.test(c)));
    expect(bordered.length).toBeLessThanOrEqual(1);
  });
});
