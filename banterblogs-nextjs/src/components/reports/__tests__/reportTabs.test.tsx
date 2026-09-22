import type { ReactNode, ViewTransitionProps } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENTRANCE_ATTRIBUTE, MOTION_ATTRIBUTE } from '@/components/motion/prePaint';
import { ENTRANCE_CARDS, ENTRANCE_CARD_STEPS, ReportTabs, TABS_ENTRANCE_GROUP, type ReportTabGroup } from '../ReportTabs';
import { NAV_FORWARD } from '../ReportTransitions';

const { url, replace, viewTransitions } = vi.hoisted(() => ({
  url: { search: '' },
  replace: vi.fn(),
  viewTransitions: [] as Array<Omit<ViewTransitionProps, 'children'>>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(url.search),
  usePathname: () => '/reports',
  useRouter: () => ({ replace }),
}));

// Next bundles the React canary that exports ViewTransition; the npm React
// these tests run on is stable and has none, so a pass-through records props.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children, ...props }: ViewTransitionProps) => {
      viewTransitions.push(props);
      return actual.createElement(actual.Fragment, null, children);
    },
  };
});

// transitionTypes never reaches the DOM; surface it for the assertions
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ transitionTypes, children, ...props }: { transitionTypes?: string[]; children?: ReactNode }) =>
      createElement('a', { ...props, 'data-transition-types': transitionTypes?.join(' ') }, children),
  };
});

const entry = (slug: string) => ({ slug, title: slug, description: '' });

const GROUPS: ReportTabGroup[] = [
  {
    key: 'phase5',
    label: 'Phase 5 — Attack Surface',
    description: 'Attack surface.',
    reports: [entry('technical-report-138'), entry('technical-report-139')],
  },
  { key: 'phase2', label: 'Phase 2 — Benchmarking', description: 'Benchmarks.', reports: [entry('technical-report-117')] },
  { key: 'phase0', label: 'Phase 0 — Pre-TR Baselines', description: 'Baselines.', reports: [entry('gemma3')] },
];
// synthesis documents lead the All tab, so no tab lists them a second time
const SYNTHESIS = [entry('technical-report-139')];

const tabsElement = (props: Partial<Parameters<typeof ReportTabs>[0]> = {}) => (
  <ReportTabs groups={GROUPS} synthesis={SYNTHESIS} latestSlug="technical-report-138" accentGroupKey="phase5" {...props} />
);
const renderTabs = (props?: Partial<Parameters<typeof ReportTabs>[0]>) => render(tabsElement(props));
const selectedTab = () => screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true');
const panel = () => screen.getByRole('tabpanel');
const panelLinks = () =>
  within(panel())
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));
const cardFor = (slug: string) => within(panel()).getByRole('link', { name: new RegExp(slug) });
const highlightRow = () => screen.getByRole('tablist').querySelector<HTMLElement>('[data-tab-highlight]')!;

beforeEach(() => {
  url.search = '';
  replace.mockReset();
  viewTransitions.length = 0;
  document.documentElement.removeAttribute(ENTRANCE_ATTRIBUTE);
  document.documentElement.removeAttribute(MOTION_ATTRIBUTE);
});

afterEach(cleanup);

describe('report archive tabs', () => {
  it('opens on All: the synthesis cards first, then every other report once', () => {
    renderTabs();

    expect(selectedTab()).toBe(screen.getAllByRole('tab')[0]);
    expect(selectedTab()?.id).toBe('report-tab-all');
    expect(panelLinks()).toEqual([
      '/reports/technical-report-139',
      '/reports/technical-report-138',
      '/reports/technical-report-117',
      '/reports/gemma3',
    ]);
  });

  it('badges the synthesis cards only', () => {
    renderTabs();

    expect(within(cardFor('technical-report-139')).getByText('Synthesis')).toBeTruthy();
    for (const slug of ['technical-report-138', 'technical-report-117', 'gemma3']) {
      expect(within(cardFor(slug)).queryByText('Synthesis'), slug).toBeNull();
    }
  });

  it('counts technical reports per tab, not the synthesis cards', () => {
    renderTabs();
    const count = (id: string) => document.getElementById(id)?.querySelector('span')?.textContent;

    expect(count('report-tab-all')).toBe('3');
    expect(count('report-tab-phase5')).toBe('1');
  });

  it('restores the tab named in ?phase=', () => {
    url.search = '?phase=phase2';
    renderTabs();

    expect(selectedTab()?.id).toBe('report-tab-phase2');
    expect(panelLinks()).toEqual(['/reports/technical-report-117']);
  });

  it('falls back to All for a phase it does not know', () => {
    url.search = '?phase=phase42';
    renderTabs();

    expect(selectedTab()?.id).toBe('report-tab-all');
  });

  it('writes the chosen tab to the URL without scrolling; All clears it', () => {
    url.search = '?phase=phase5';
    renderTabs();

    fireEvent.click(screen.getByRole('tab', { name: /Phase 2/ }));
    expect(replace).toHaveBeenLastCalledWith('/reports?phase=phase2', { scroll: false });
    expect(selectedTab()?.id).toBe('report-tab-phase2');

    fireEvent.click(screen.getByRole('tab', { name: /^All/ }));
    expect(replace).toHaveBeenLastCalledWith('/reports', { scroll: false });
  });

  it('moves with the arrow keys, Home and End, focus leading the selection', () => {
    renderTabs();
    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();

    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(document.activeElement).toBe(tabs[tabs.length - 1]);
    expect(replace).toHaveBeenLastCalledWith('/reports?phase=phase0', { scroll: false });

    // focus leads a pending URL update, so a second key press steps from it
    fireEvent.keyDown(tabs[tabs.length - 1], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs[tabs.length - 2]);
    expect(replace).toHaveBeenLastCalledWith('/reports?phase=phase2', { scroll: false });

    fireEvent.keyDown(tabs[tabs.length - 2], { key: 'Home' });
    expect(document.activeElement).toBe(tabs[0]);
    expect(replace).toHaveBeenLastCalledWith('/reports', { scroll: false });
  });

  it('keeps a roving tabindex on the selected tab', () => {
    renderTabs();
    fireEvent.click(screen.getByRole('tab', { name: /Phase 2/ }));

    expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([-1, -1, 0, -1]);
  });

  it('sends each card forward and pairs its visual and title with the report page hero and heading', () => {
    renderTabs();
    const cards = within(panel()).getAllByRole('link');

    expect(cards.map((card) => card.getAttribute('data-transition-types'))).toEqual(cards.map(() => NAV_FORWARD));
    expect([...new Set(viewTransitions.map((vt) => vt.name))]).toEqual(
      ['technical-report-139', 'technical-report-138', 'technical-report-117', 'gemma3'].flatMap((slug) => [
        `report-figure-${slug}`,
        `report-title-${slug}`,
      ]),
    );
  });

  it('marks the newest report live and lights the newest phase', () => {
    renderTabs();

    expect(cardFor('technical-report-138').querySelectorAll('.live-dot')).toHaveLength(1);
    expect(within(panel()).getAllByRole('link').filter((card) => card.querySelector('.live-dot'))).toHaveLength(1);
    expect(cardFor('technical-report-138').querySelector('svg')?.getAttribute('data-accent')).toBe('on');
    expect(cardFor('technical-report-117').querySelector('svg')?.hasAttribute('data-accent')).toBe(false);
  });
});

describe('report archive motion wiring', () => {
  it('joins the tabs to the head entrance and the first cards to it one row step apart', () => {
    const many: ReportTabGroup[] = [
      { key: 'phase3', label: 'Phase 3', description: '', reports: Array.from({ length: 9 }, (_, i) => entry(`technical-report-${123 + i}`)) },
    ];
    renderTabs({ groups: many, synthesis: [], latestSlug: undefined });
    const wrappers = within(panel()).getAllByRole('link').map((card) => card.parentElement!);

    expect(screen.getByRole('tablist').parentElement?.className).toBe('entrance-group');
    expect(screen.getByRole('tablist').parentElement?.style.getPropertyValue('--group')).toBe(String(TABS_ENTRANCE_GROUP));
    expect(wrappers.every((wrapper) => wrapper.hasAttribute('data-reveal'))).toBe(true);
    const joined = wrappers.filter((wrapper) => wrapper.hasAttribute('data-entrance-item'));
    expect(joined).toEqual(wrappers.slice(0, ENTRANCE_CARDS));
    // the first row staggers; the rest start with its last card
    expect(joined.map((wrapper) => wrapper.style.getPropertyValue('--entrance-i'))).toEqual(
      Array.from({ length: ENTRANCE_CARDS }, (_, i) => String(Math.min(i, ENTRANCE_CARD_STEPS - 1))),
    );
  });

  it('serves the active tab its own style and underline until the highlight is placed', () => {
    const markup = renderToStaticMarkup(tabsElement());
    const active = /<button[^>]*aria-selected="true"[^>]*>([\s\S]*?)<\/button>/.exec(markup)?.[1] ?? '';

    expect(active).toContain('tab-underline');
    expect(markup).toMatch(/<div aria-hidden="true" data-tab-highlight=""/);
    expect(markup).not.toContain('data-highlight=');
  });

  it('repeats every tab in the highlight row, out of the accessibility tree', () => {
    renderTabs();

    expect(highlightRow().getAttribute('aria-hidden')).toBe('true');
    expect(highlightRow().children).toHaveLength(screen.getAllByRole('tab').length);
    expect([...highlightRow().children].map((copy) => copy.textContent)).toEqual(screen.getAllByRole('tab').map((tab) => tab.textContent));
  });

  it('clips the highlight row to the active tab once mounted, when motion is armed', () => {
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'on');
    renderTabs();
    const list = screen.getByRole('tablist');

    expect(list.getAttribute('data-highlight')).toMatch(/placed|live/);
    expect(highlightRow().style.getPropertyValue('--highlight-left')).toMatch(/^-?\d+px$/);
    expect(highlightRow().style.getPropertyValue('--highlight-right')).toMatch(/^-?\d+px$/);
  });

  it('keeps the active tab its own style while motion is off, so nothing changes at load', () => {
    renderTabs();
    const list = screen.getByRole('tablist');

    expect(list.hasAttribute('data-highlight')).toBe(false);
    expect(highlightRow().style.getPropertyValue('--highlight-left')).toBe('');
    expect(selectedTab()?.querySelector('.tab-underline')).not.toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Phase 2/ }));
    expect(selectedTab()?.querySelector('.tab-underline')).not.toBeNull();
    expect(list.hasAttribute('data-highlight')).toBe(false);
  });

  it('crossfades the grid after a pointer switch and swaps it at once on a keyboard switch', () => {
    renderTabs();
    expect(panel().hasAttribute('data-switched')).toBe(false);

    const tabs = screen.getAllByRole('tab');
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(panel().hasAttribute('data-switched')).toBe(false);

    fireEvent.click(screen.getByRole('tab', { name: /Phase 2/ }));
    expect(panel().hasAttribute('data-switched')).toBe(true);
  });

  it('closes the first-load entrance when the visitor switches tab, and when the archive unmounts', () => {
    document.documentElement.setAttribute(ENTRANCE_ATTRIBUTE, '/reports');
    const { unmount } = renderTabs();
    fireEvent.click(screen.getByRole('tab', { name: /Phase 2/ }));
    expect(document.documentElement.hasAttribute(ENTRANCE_ATTRIBUTE)).toBe(false);

    document.documentElement.setAttribute(ENTRANCE_ATTRIBUTE, '/reports');
    unmount();
    expect(document.documentElement.hasAttribute(ENTRANCE_ATTRIBUTE)).toBe(false);
  });
});
