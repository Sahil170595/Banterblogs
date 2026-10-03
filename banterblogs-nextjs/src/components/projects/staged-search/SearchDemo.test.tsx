import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ladder = () => screen.getByRole('region', { name: 'The same search at every relaxation threshold' });
const results = () => screen.getByRole('region', { name: 'Search results' });
const file = (body: unknown) => ({ size: 100, text: async () => JSON.stringify(body) });

describe('staged search demo', () => {
  it('opens on the source example: every filter dropped, ready, two of four outside the request', () => {
    render(<SearchDemo />);
    expect(
      screen.getByText(/At the source's threshold of 6, this search drops every filter it was given and reports ready with 4 results, two of which break the request\./),
    ).toBeTruthy();
    expect(within(ladder()).getAllByRole('row')).toHaveLength(4);
    expect(within(results()).getByText('Ready')).toBeTruthy();
    expect(within(results()).getAllByText('outside the request')).toHaveLength(2);
  });

  it('runs a ladder row in the pipeline below', () => {
    render(<SearchDemo />);
    fireEvent.click(within(ladder()).getByRole('button', { name: /^1 to 3/ }));
    expect(within(results()).getByText('Shortfall')).toBeTruthy();
    expect(within(results()).getByText('No filter dropped.')).toBeTruthy();
  });

  it('keeps the last good query while the form holds one the source refuses', () => {
    render(<SearchDemo />);
    fireEvent.change(screen.getByLabelText('Filter 1 value'), { target: { value: 'next year' } });
    expect(screen.getByText(/The source would refuse this query/)).toBeTruthy();
    expect(within(results()).getByText('Ready')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filter 1 value'), { target: { value: '2020' } });
    expect(screen.queryByText(/The source would refuse this query/)).toBeNull();
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
