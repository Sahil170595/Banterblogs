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

const headline = () => screen.getByText(/^Asked for/).textContent!;
const tools = () => screen.getByText('Edit the query, see the scores, export a run').closest('details')!;
const scores = () => screen.getByRole('region', { name: 'Scores' });

describe('staged search demo, after live QA', () => {
  // "returns 1 note, none of which do not match", "matching 0 filters … drops none of its filters"
  it('words its headline for one result and for no filters', () => {
    render(<SearchDemo />);
    fireEvent.change(screen.getByLabelText('Results wanted'), { target: { value: '1' } });
    expect(headline()).not.toMatch(/none of which|1 note, all matching|1 notes/);
    fireEvent.change(screen.getByLabelText('Results wanted'), { target: { value: '4' } });
    for (const n of [3, 2, 1]) fireEvent.click(screen.getByRole('button', { name: `Remove filter ${n}` }));
    expect(headline()).toMatch(/with no filters/);
    expect(headline()).not.toMatch(/drops none of its filters|0 filters|none of which/);
  });

  // one row, "1 to 50", a lead offering it as a second row, and a blank scores panel
  it('handles a query no note matches', () => {
    render(<SearchDemo />);
    fireEvent.change(screen.getByLabelText('Description, the keyword query'), { target: { value: 'zzzz nothing matches' } });
    expect(within(ladder()).getAllByRole('row')).toHaveLength(2);
    expect(within(ladder()).getByRole('button', { name: /^1 or more/ })).toBeTruthy();
    expect(screen.getByText(/Pick a row to see its results underneath/).textContent).not.toMatch(/then/);
    expect(scores().textContent).toMatch(/No notes to score/);
  });

  it('says what the score is in body-only mode', () => {
    render(<SearchDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Body only' }));
    expect(scores().textContent).toMatch(/body search’s own/);
    expect(scores().textContent).not.toMatch(/reciprocal rank fusion/);
  });

  // a topic filter flagged results outside the request with nothing struck
  it('strikes the value that breaks the request, even in a field the results do not show', () => {
    render(<SearchDemo />);
    for (const n of [3, 2]) fireEvent.click(screen.getByRole('button', { name: `Remove filter ${n}` }));
    fireEvent.change(screen.getByLabelText('Filter 1 field'), { target: { value: 'topic' } });
    fireEvent.change(screen.getByLabelText('Filter 1 value'), { target: { value: 'storage' } });
    const outside = within(results()).getAllByText('no, outside the request');
    expect(outside.length).toBeGreaterThan(0);
    for (const flag of outside) expect(flag.closest('tr')!.querySelector('[data-broken="true"]')?.textContent).toMatch(/topic/);
  });

  it('says why filters dropped, and that the threshold sets how far', () => {
    render(<SearchDemo />);
    expect(within(results()).getByText(/because the first search found fewer than 6 candidates/)).toBeTruthy();
    expect(screen.getByText(/until the first search finds at least as many candidates as the threshold/)).toBeTruthy();
  });

  // "(filters 0 value: Invalid input)", "String must contain at least 1 character(s)"
  it('says what is wrong with a query in the form’s own words', () => {
    render(<SearchDemo />);
    fireEvent.change(screen.getByLabelText('Filter 1 value'), { target: { value: 'abc' } });
    expect(screen.getByText(/Filter 1 should be a year from 2000 to 2100/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filter 1 value'), { target: { value: '2025.5' } });
    expect(screen.getByText(/Filter 1 should be a year from 2000 to 2100/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Description, the keyword query'), { target: { value: '   ' } });
    expect(screen.getByText(/Description cannot be empty/)).toBeTruthy();
  });

  // on a phone an edit changed results above and scores below, and nothing in view
  it('shows the run’s verdict beside the query form', () => {
    render(<SearchDemo />);
    const line = screen.getByTestId('query-verdict');
    expect(line.closest('form')).toBeTruthy();
    expect(line.textContent).toMatch(/^Ready/);
    fireEvent.change(screen.getByLabelText('Relaxation threshold'), { target: { value: '1' } });
    expect(line.textContent).toMatch(/^Shortfall/);
  });

  it('answers an import beside its button, refuses settings the menus cannot show, and clears the last success', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<SearchDemo />);
    fireEvent.change(screen.getByLabelText('Run file'), { target: { files: [file(makeReceipt(EXAMPLE_QUERY, DEFAULT_SETTINGS))] } });
    await waitFor(() => expect(within(tools()).getByText(/File rerun/)).toBeTruthy());
    const beyond = makeReceipt(EXAMPLE_QUERY, { ...DEFAULT_SETTINGS, relax_threshold: 13 });
    fireEvent.change(screen.getByLabelText('Run file'), { target: { files: [file(beyond)] } });
    await waitFor(() => expect(within(tools()).getByRole('alert').textContent).toMatch(/^File refused: settings › relax_threshold should be at most 12/));
    expect(within(tools()).queryByText(/File rerun/)).toBeNull();
  });
});
