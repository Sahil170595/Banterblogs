import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IntakeLab from './IntakeLab';
import { evaluate, exportRun } from '@/lib/projects/intake-policy/engine';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('intake workbench applied state', () => {
  it('toggles case settings without changing the applied priority', () => {
    render(<IntakeLab />);
    const toggle = screen.getByRole('button', { name: 'Case settings' });
    const initial = screen.getByLabelText('Applied priority').textContent;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Applied priority').textContent).toBe(initial);
  });
  it('keeps an edited case separate from results and exports the applied snapshot', async () => {
    let captured: Blob | undefined;
    vi.stubGlobal('URL', { createObjectURL: vi.fn((blob: Blob) => { captured = blob; return 'blob:receipt'; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<IntakeLab />);
    fireEvent.change(screen.getByLabelText('Advisory flag'), { target: { value: 'clear' } });
    fireEvent.click(screen.getByLabelText('Care-related context'));
    expect(screen.getByText('Unapplied changes')).toBeTruthy();
    expect(screen.getByLabelText('Applied priority').textContent).toBe('P2');
    fireEvent.click(screen.getByRole('button', { name: 'Export applied result' }));
    expect(captured).toBeTruthy();
    const contents = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(captured!);
    });
    expect(JSON.parse(contents)).toEqual(exportRun(evaluate()));
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByLabelText('Applied priority').textContent).toBe('P0');
    expect(screen.getByLabelText('Applied operational score').textContent).toBe('Bypassed');
    fireEvent.click(screen.getByRole('button', { name: 'Reset case and policy' }));
    expect(screen.getByLabelText('Applied priority').textContent).toBe('P2');
    expect((screen.getByLabelText('Care-related context') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText('Applied snapshot / synthetic only')).toBeTruthy();
  });
  it('applies synthetic presets and prevents a conflicted account preview', () => {
    render(<IntakeLab />);
    fireEvent.change(screen.getByLabelText('Synthetic case'), { target: { value: 'conflict' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByText('Yes; reconciliation needed')).toBeTruthy();
    expect(screen.queryByText('QUEUE-C1')).toBeNull();
    expect(screen.getByText('No matching preview. No resource reserved.')).toBeTruthy();
  });
  it('rejects invalid policy edits without overwriting the last applied result', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<IntakeLab />);
    fireEvent.change(screen.getByLabelText('Today + action weight'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByLabelText('Applied priority').textContent).toBe('P2');
    expect(screen.getByText('Unapplied changes')).toBeTruthy();
  });
  it('imports a recomputed receipt and rejects changed result evidence', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<IntakeLab />);
    const r = evaluate({ ...evaluate().features, backstop: true });
    const file = new File(['receipt'], 'receipt.json');
    Object.defineProperty(file, 'text', { value: async () => JSON.stringify(exportRun(r)) });
    fireEvent.change(screen.getByLabelText('Receipt file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByLabelText('Applied priority').textContent).toBe('P0'));
    const altered = new File(['altered'], 'altered.json');
    Object.defineProperty(altered, 'text', { value: async () => JSON.stringify({ ...exportRun(r), result: { ...r, priority: 'P3' } }) });
    fireEvent.change(screen.getByLabelText('Receipt file'), { target: { files: [altered] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Replay mismatch'));
    expect(screen.getByLabelText('Applied priority').textContent).toBe('P0');
  });
  it('does not let a late receipt import overwrite a reset', async () => {
    render(<IntakeLab />);
    let finish!: (text: string) => void;
    const file = new File(['receipt'], 'receipt.json');
    Object.defineProperty(file, 'text', { value: () => new Promise<string>(resolve => { finish = resolve; }) });
    fireEvent.change(screen.getByLabelText('Receipt file'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset case and policy' }));
    await act(async () => { finish(JSON.stringify(exportRun(evaluate({ ...evaluate().features, backstop: true })))); });
    expect(screen.getByLabelText('Applied priority').textContent).toBe('P2');
    expect(screen.getByText('Applied snapshot / synthetic only')).toBeTruthy();
  });
});
