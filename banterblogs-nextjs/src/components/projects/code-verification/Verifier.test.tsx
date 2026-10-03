import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { evaluate, initialConfig } from '@/lib/projects/code-verification/engine';
import { Verifier } from './Verifier';

afterEach(cleanup);

describe('verifier interactions without a browser', () => {
  it('does not serialize bundler-dependent function text into initial HTML', () => {
    expect(renderToStaticMarkup(<Verifier />)).not.toContain('function interval');
  });
  it('replays configuration rather than trusting an imported verdict', async () => {
    render(<Verifier />);
    const report = evaluate({ ...initialConfig(), candidateId: 'empty' });
    const file = { size: 1000, text: async () => JSON.stringify({ ...report, resolved: true }) };
    fireEvent.change(screen.getByLabelText('Import report file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Not resolved'));
    expect((screen.getByLabelText('Implementation') as HTMLSelectElement).value).toBe('empty');
  });
  it('accepts a maximum-sized export from the bounded assertion editor', async () => {
    render(<Verifier />);
    const input = Array.from({ length: 64 }, (_, i) => `${i}-${'a'.repeat(124)}`);
    const report = evaluate({ ...initialConfig('unique'), mode: 'synthesis', assertions: Array.from({ length: 16 }, (_, i) => ({ id: `large-${i}`, label: 'Bounded assertion', input, expected: input })) });
    const body = JSON.stringify(report, null, 2);
    expect(body.length).toBeGreaterThan(100_000);
    fireEvent.change(screen.getByLabelText('Import report file'), { target: { files: [{ size: body.length, text: async () => body }] } });
    await waitFor(() => expect(screen.getByText('16/16 candidates')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('runs a chosen candidate and clears stale results on configuration changes', () => {
    render(<Verifier />);
    fireEvent.change(screen.getByLabelText('Implementation'), { target: { value: 'overfit' } });
    fireEvent.change(screen.getByLabelText('Verification suite'), { target: { value: 'smoke' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run verification' }));
    expect(screen.getByRole('status').textContent).toContain('Suite satisfied');
    fireEvent.change(screen.getByLabelText('Verification suite'), { target: { value: 'full' } });
    expect(screen.getByRole('status').textContent).toContain('Not run');
    fireEvent.click(screen.getByRole('button', { name: 'Run verification' }));
    expect(screen.getByRole('status').textContent).toContain('Not resolved');
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Unsorted touching chain' }));
    expect(within(screen.getByLabelText('Selected test evidence')).getByText('Unsorted touching chain')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset verifier' }));
    expect(screen.getByRole('status').textContent).toContain('Not run');
    expect((screen.getByLabelText('Implementation') as HTMLSelectElement).value).toBe('fixed');
  });
  it('scores authored assertions on buggy and fixed code, and rejects invalid JSON', () => {
    render(<Verifier />);
    fireEvent.click(screen.getByRole('button', { name: 'Test synthesis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run synthesis' }));
    expect(screen.getByRole('status').textContent).toContain('Reproduces');
    fireEvent.click(screen.getByRole('button', { name: 'Clear assertions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run synthesis' }));
    expect(screen.getByRole('status').textContent).toContain('Not resolved');
    fireEvent.change(screen.getByLabelText('Assertion input (JSON)'), { target: { value: 'oops' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add assertion' }));
    expect(screen.getByRole('alert').textContent).toContain('valid JSON');
    fireEvent.change(screen.getByLabelText('Assertion input (JSON)'), { target: { value: '[[0, 2], [2, 7]]' } });
    fireEvent.change(screen.getByLabelText('Expected output (JSON)'), { target: { value: '[[0, 7]]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add assertion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run synthesis' }));
    expect(screen.getByRole('status').textContent).toContain('Reproduces');
    fireEvent.change(screen.getByLabelText('Task'), { target: { value: 'unique' } });
    expect(screen.getByRole('status').textContent).toContain('Not run');
    expect(screen.queryByRole('button', { name: 'Remove Authored assertion 1' })).toBeNull();
  });
});
