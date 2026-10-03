import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXAMPLE_QUERY } from '@/lib/projects/staged-search/example';
import { makeReceipt } from '@/lib/projects/staged-search/receipt';
import { DEFAULT_SETTINGS } from '@/lib/projects/staged-search/schema';
import { SearchDemo } from './SearchDemo';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

// jsdom lays nothing out and has no scrollIntoView or matchMedia; a picked
// row reveals its results through both (components/projects/reveal.ts)
const scrollIntoView = vi.fn();
beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  scrollIntoView.mockClear();
});

const ladder = () => screen.getByRole('region', { name: 'The same search at every relaxation threshold' });
const results = () => screen.getByRole('region', { name: 'Search results' });
const file = (body: unknown) => ({ size: 100, text: async () => JSON.stringify(body) });

describe('staged search demo', () => {
  it('opens on the source example: every filter dropped, ready, two of four outside the request', () => {
    render(<SearchDemo />);
    expect(
      screen.getByText(
        /Asked for 4 notes matching 3 filters and containing “cache”, the search drops filters while it has fewer than 6 candidates, its default threshold\. Here it drops every filter, reports “ready” and returns 4 notes, two of which do not match the request\. At thresholds 1 to 3 it drops nothing and reports a shortfall: 2 notes, both matching\./,
      ),
    ).toBeTruthy();
    // the hard criterion is part of the request, beside the filters it can drop
    const request = screen.getByText('The request').parentElement!;
    expect(within(request).getByText('contains “cache”').closest('[data-hard]')).toBeTruthy();
    expect(within(request).getByText('hard, never dropped')).toBeTruthy();
    expect(within(ladder()).getAllByRole('row')).toHaveLength(4);
    expect(within(results()).getByText('Ready')).toBeTruthy();
    expect(within(results()).getAllByText('no, outside the request')).toHaveLength(2);
  });

  it('says the outside-the-request flag is the page’s, not the original’s', () => {
    render(<SearchDemo />);
    expect(
      within(results()).getByText(/flag is this page’s addition, checked against your original filters: StrataSearch’s own output does not mark/),
    ).toBeTruthy();
  });

  it('names every value’s column, so a phone can stack each row as a card', () => {
    render(<SearchDemo />);
    for (const table of [within(ladder()).getByRole('table'), within(results()).getByRole('table')]) {
      const cells = within(table).getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) expect(cell.getAttribute('data-label')).toBeTruthy();
    }
    expect(
      within(ladder())
        .getAllByRole('cell')
        .map((c) => c.getAttribute('data-label')),
    ).toContain('Match the request');
  });

  it('runs a ladder row in the results below and brings them into view', () => {
    render(<SearchDemo />);
    fireEvent.click(within(ladder()).getByRole('button', { name: /^1 to 3/ }));
    expect(within(results()).getByText('Shortfall')).toBeTruthy();
    // the row stands for a range of thresholds, and the verdict says so
    expect(within(results()).getByText('2 of 4 results at thresholds 1 to 3')).toBeTruthy();
    expect(within(results()).getByText('No filter dropped.')).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(results().classList.contains('demo-revealed')).toBe(true);
  });

  it('keeps the last good query while the form holds one the source refuses', () => {
    render(<SearchDemo />);
    fireEvent.change(screen.getByLabelText('Filter 1 value'), { target: { value: 'next year' } });
    expect(screen.getByText(/StrataSearch would refuse this query/)).toBeTruthy();
    expect(within(results()).getByText('Ready')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filter 1 value'), { target: { value: '2020' } });
    expect(screen.queryByText(/StrataSearch would refuse this query/)).toBeNull();
  });

  it('reruns an imported run and refuses a forged one', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<SearchDemo />);
    const strict = makeReceipt(EXAMPLE_QUERY, { ...DEFAULT_SETTINGS, relax_threshold: 3 });
    fireEvent.change(screen.getByLabelText('Run file'), { target: { files: [file(strict)] } });
    await waitFor(() => expect(within(results()).getByText('Shortfall')).toBeTruthy());
    const forged = makeReceipt(EXAMPLE_QUERY, DEFAULT_SETTINGS);
    forged.result.status = 'shortfall';
    fireEvent.change(screen.getByLabelText('Run file'), { target: { files: [file(forged)] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/do not follow/));
    expect(warn).toHaveBeenCalled();
  });
});
