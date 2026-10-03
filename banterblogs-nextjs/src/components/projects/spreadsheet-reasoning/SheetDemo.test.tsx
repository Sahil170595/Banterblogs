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

// jsdom has no layout or scrolling; the reveal is asserted by its call
const { revealResult } = vi.hoisted(() => ({ revealResult: vi.fn() }));
vi.mock('../reveal', () => ({ revealResult }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  revealResult.mockClear();
});

const fileTools = () => screen.getByRole('button', { name: 'Replay JSON' }).closest('[data-file-tools]') as HTMLElement;

describe('spreadsheet demo, after live QA', () => {
  // a refusal was a raw validation dump, Recalculate stayed on, and every cell read "pending"
  it('refuses an empty value beside the editor, keeps Recalculate off, and keeps the last results in view', () => {
    render(<SheetDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Inputs!B2' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Value or formula' }), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Recalculate' }).hasAttribute('disabled')).toBe(true);
    const editor = screen.getByRole('heading', { name: 'Edit Inputs!B2' }).parentElement!;
    expect(within(editor).getByRole('alert').textContent).toBe('Inputs!B2: enter a value or a formula.');
    expect(document.body.textContent).not.toMatch(/"code"/);
    const row = (id: string) => screen.getByRole('button', { name: `Inspect ${id}` }).closest('tr')!;
    expect(within(row('Calc!B4')).getByText('840')).toBeTruthy();
    expect(within(row('Inputs!B2')).getByText('edited')).toBeTruthy();
  });

  it('answers a refused replay beside its button, in plain words, and says when a replay landed', async () => {
    render(<SheetDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }).closest('details')!.querySelector('summary')!);
    fireEvent.change(screen.getByLabelText('JSON replay file'), { target: { files: [{ size: 10, text: async () => '{"trunc' }] } });
    await waitFor(() => expect(within(fileTools()).getByRole('alert').textContent).toBe('Replay refused: The file is not valid JSON.'));
    const body = JSON.stringify(exportTrace(freshSession()));
    fireEvent.change(screen.getByLabelText('JSON replay file'), { target: { files: [{ size: body.length, text: async () => body }] } });
    await waitFor(() => expect(fileTools().textContent).toMatch(/Replayed/));
    expect(within(fileTools()).queryByRole('alert')).toBeNull();
    expect(fileTools().textContent).not.toMatch(/Trace/);
  });

  it('brings the inspector into view when a cell in the graph is picked', () => {
    render(<SheetDemo />);
    fireEvent.click(within(graph()).getByRole('button', { name: /^Calc!B4,/ }));
    expect(revealResult).toHaveBeenCalledWith(screen.getByRole('region', { name: 'Selected cell evidence' }));
  });

  // the review control showed Off after a drop made in the inspector, and Off did not undo it
  it('shows any review the inspector made, and Off clears every one', () => {
    render(<SheetDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Calc!B4' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Prune-only review' }), { target: { value: 'drop' } });
    expect(strip('Finals found')).toBe('1 of 2');
    expect(screen.getByRole('radio', { name: 'Off' })).toHaveProperty('checked', false);
    expect(screen.getByText(/Reviewed in the inspector: Calc!B4 dropped/)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Off' }));
    expect(strip('Finals found')).toBe('2 of 2');
    expect(screen.getByRole('radio', { name: 'Off' })).toHaveProperty('checked', true);
  });

  // the cycles workbook kept the baseline's headline, its review option and its key
  it('describes the cycles workbook on its own terms', () => {
    render(<SheetDemo />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Workbook' }), { target: { value: 'broken' } });
    expect(screen.getByText(/^\d+ of \d+ cells cannot be computed/)).toBeTruthy();
    expect(screen.getByText(/no answer key, so nothing here is scored/)).toBeTruthy();
    expect(screen.queryByText(/the rules find 2 of 2 final values/)).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Drop Report!B4' })).toBeNull();
    const key = screen.getByRole('list', { name: 'Graph key' });
    expect(within(key).queryByText('Wrong against the key')).toBeNull();
    expect(within(key).getByText(/Invalid/)).toBeTruthy();
  });
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
