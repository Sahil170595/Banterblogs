import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportTrace, freshSession } from '@/lib/projects/spreadsheet-reasoning/engine';
import Inspector from './Inspector';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('spreadsheet inspector controls', () => {
  it('runs an input edit, withholds stale evidence, and resets the complete session', () => {
    render(<Inspector />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Inputs!B2' }));
    fireEvent.change(screen.getByLabelText('Value or formula'), { target: { value: '200' } });
    expect(screen.getByText('Pending edits')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export JSON' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Recalculate' }));
    const row = screen.getByRole('button', { name: 'Inspect Calc!B4' }).closest('tr')!;
    expect(within(row).getByText('1,400')).toBeTruthy();
    expect(screen.getByText(/Gold comparison unavailable/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset workbook' }));
    expect(screen.getByLabelText('Value or formula')).toHaveProperty('value', '=SUM(B2:B3)');
    expect(screen.queryByText('Pending edits')).toBeNull();
  });
  it('prunes a false positive and recomputes the synthetic confusion counts', () => {
    render(<Inspector />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Report!B4' }));
    fireEvent.change(screen.getByLabelText('Adjudication'), { target: { value: 'drop' } });
    expect(screen.getByText('TP 2 / FP 0 / FN 0 / TN 9')).toBeTruthy();
  });
  it('switches fixtures and renders real cycle errors', () => {
    render(<Inspector />);
    fireEvent.change(screen.getByLabelText('Synthetic workbook'), { target: { value: 'broken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Calc!B2' }));
    expect(screen.getByRole('alert').textContent).toMatch(/Cycle detected/);
  });
  it('replays session inputs but never trusts uploaded result fields', async () => {
    render(<Inspector />);
    const session = freshSession();
    session.workbook.cells[0].input = '200';
    const trace = exportTrace(session);
    trace.result.cells['Calc!B4'].value = 9999;
    const file = new File([JSON.stringify(trace)], 'trace.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => JSON.stringify(trace) });
    fireEvent.change(screen.getByLabelText('JSON replay file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText('Session replayed; results recomputed, not trusted from the file.')).toBeTruthy());
    const row = screen.getByRole('button', { name: 'Inspect Calc!B4' }).closest('tr')!;
    expect(within(row).getByText('1,400')).toBeTruthy();
    expect(screen.queryByText('9,999')).toBeNull();
  });
  it('rejects malformed replay without replacing the current workbook', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Inspector />);
    const file = new File(['{}'], 'trace.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => '{}' });
    fireEvent.change(screen.getByLabelText('JSON replay file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Replay rejected/));
    expect(screen.getByLabelText('Value or formula')).toHaveProperty('value', '=SUM(B2:B3)');
    expect(logged).toHaveBeenCalled();
  });
});
