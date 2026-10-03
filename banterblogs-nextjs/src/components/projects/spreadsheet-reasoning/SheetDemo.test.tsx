import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportTrace, freshSession } from '@/lib/projects/spreadsheet-reasoning/engine';
import { SheetDemo } from './SheetDemo';

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

const graph = () => screen.getByRole('region', { name: 'Workbook dependency graph' });
const strip = (term: string) => within(screen.getByText(term).closest('div')!).getByRole('definition').textContent;

describe('spreadsheet demo', () => {
  // under the gate a 3-to-1 final goes to review too: that is no tie
  it('says what sends a cell to review under each policy', () => {
    render(<SheetDemo />);
    expect(screen.getByText('Review: final and intermediate votes tied')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Precision gate, no negative votes' }));
    expect(screen.getByText('Review: votes tied, or a final with any vote against')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Balanced votes, more final than intermediate' })).toBeTruthy();
  });

  it('opens on the scratch cell the balanced rules wrongly call final', () => {
    render(<SheetDemo />);
    expect(
      screen.getByText(
        /With balanced votes the rules find 2 of 2 final values and wrongly mark 1 scratch cell final\. The precision gate, built to be stricter, finds none and still marks the scratch cell\./,
      ),
    ).toBeTruthy();
    // the key and the terms are defined before the graph
    expect(screen.getByText(/The answer key marks Calc!B4 and Report!B2 final \(both “Total margin”\); Report!B4, “Scratch estimate”, is not\./)).toBeTruthy();
    expect(within(graph()).getByRole('button', { name: /^Report!B4, Scratch estimate: 6, labelled final, not final in the key$/, pressed: true })).toBeTruthy();
    expect(strip('False finals')).toBe('1');
    expect(screen.getByRole('heading', { name: 'Report!B4' })).toBeTruthy();
  });

  it('shows the precision gate sending both true finals to review', () => {
    render(<SheetDemo />);
    fireEvent.click(screen.getByRole('radio', { name: /Precision gate/ }));
    expect(strip('Finals found')).toBe('0 of 2');
    expect(within(graph()).getByRole('button', { name: /^Calc!B4, .*labelled review, final in the key$/ })).toBeTruthy();
  });

  it('drops the scratch cell in a prune-only review and reaches a perfect key match', () => {
    render(<SheetDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Drop Report!B4' }));
    expect(strip('False finals')).toBe('0');
    expect(strip('F1')).toBe('100%');
  });

  it('says when a policy switch clears the review, and why precision has no value', () => {
    render(<SheetDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Drop Report!B4' }));
    fireEvent.click(screen.getByRole('radio', { name: /Precision gate/ }));
    expect(screen.getByText(/Switching the policy cleared the review/).getAttribute('role')).toBe('status');
    expect(screen.getByRole('radio', { name: 'Off' })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('radio', { name: 'Drop Report!B4' }));
    expect(strip('Precision')).toBe('n/a nothing marked final');
  });

  it('selects a cell from the graph and shows its votes', () => {
    render(<SheetDemo />);
    fireEvent.click(within(graph()).getByRole('button', { name: /^Calc!B4,/ }));
    expect(screen.getByRole('heading', { name: 'Calc!B4' })).toBeTruthy();
    expect(screen.getByText('Consumed downstream')).toBeTruthy();
    // each rule says what it looks at
    expect(screen.getByText('other cells use it')).toBeTruthy();
  });

  it('holds edits until recalculation, then drops the key comparison for the edited workbook', () => {
    render(<SheetDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Inputs!B2' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Value or formula' }), { target: { value: '200' } });
    expect(screen.getByRole('button', { name: 'Export JSON' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Recalculate' }));
    const row = screen.getByRole('button', { name: 'Inspect Calc!B4' }).closest('tr')!;
    expect(within(row).getByText('1,400')).toBeTruthy();
    expect(screen.queryByText('False finals')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset workbook' }));
    expect(strip('False finals')).toBe('1');
  });

  it('shows real cycle errors in the failure workbook', () => {
    render(<SheetDemo />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Workbook' }), { target: { value: 'broken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Calc!B2' }));
    expect(screen.getAllByRole('alert').some((a) => /Cycle detected/.test(a.textContent ?? ''))).toBe(true);
  });

  it('replays session inputs and never trusts uploaded results', async () => {
    render(<SheetDemo />);
    const session = freshSession();
    session.workbook.cells[0].input = '200';
    const body = JSON.stringify({ ...exportTrace(session), result: { cells: { 'Calc!B4': { value: 9999 } } } });
    // jsdom's File has no text(); a browser's does
    const file = { size: body.length, text: async () => body };
    fireEvent.change(screen.getByLabelText('JSON replay file'), { target: { files: [file] } });
    await waitFor(() => expect(within(screen.getByRole('button', { name: 'Inspect Calc!B4' }).closest('tr')!).getByText('1,400')).toBeTruthy());
  });
});
