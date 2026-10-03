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
  it('opens on the scratch cell the balanced rules wrongly call final', () => {
    render(<SheetDemo />);
    expect(screen.getByText(/Balanced votes find 2 of 2 final values and wrongly mark 1 scratch cell final\. The precision gate, built to be stricter, finds none and still marks the scratch cell\./)).toBeTruthy();
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

  it('selects a cell from the graph and shows its votes', () => {
    render(<SheetDemo />);
    fireEvent.click(within(graph()).getByRole('button', { name: /^Calc!B4,/ }));
    expect(screen.getByRole('heading', { name: 'Calc!B4' })).toBeTruthy();
    expect(screen.getByText('Consumed upstream')).toBeTruthy();
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
