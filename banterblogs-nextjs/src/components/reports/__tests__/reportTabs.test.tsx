import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportTabs, type ReportTabGroup } from '../ReportTabs';

const { url, replace } = vi.hoisted(() => ({ url: { search: '' }, replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(url.search),
  usePathname: () => '/reports',
  useRouter: () => ({ replace }),
}));

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
// featured reports are pinned above the tabs, so no tab lists them again
const FEATURED = ['technical-report-139'];

const renderTabs = () => render(<ReportTabs groups={GROUPS} featuredSlugs={FEATURED} />);
const selectedTab = () => screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true');
const panelLinks = () =>
  within(screen.getByRole('tabpanel'))
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));

beforeEach(() => {
  url.search = '';
  replace.mockReset();
});

afterEach(cleanup);

describe('report archive tabs', () => {
  it('opens on All, listing every report not already featured', () => {
    renderTabs();

    expect(selectedTab()).toBe(screen.getAllByRole('tab')[0]);
    expect(selectedTab()?.id).toBe('report-tab-all');
    expect(panelLinks()).toEqual([
      '/reports/technical-report-138',
      '/reports/technical-report-117',
      '/reports/gemma3',
    ]);
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
});
