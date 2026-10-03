import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { evaluate, initialConfig } from '@/lib/projects/code-verification/engine';
import { CodeVerificationDemo } from './CodeVerificationDemo';
import { Verifier } from './Verifier';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

afterEach(cleanup);

const verdict = () => screen.getByRole('status').textContent ?? '';

describe('code verification demo', () => {
  it('opens where the smoke suite misleads: the example-only patch, passing two tests', () => {
    render(<CodeVerificationDemo />);
    expect(screen.getByText(/On the two-test smoke suite, 3 of 4 patches pass\. On the full suite, 1 does\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Example-only repair', pressed: true })).toBeTruthy();
    expect(verdict()).toContain('Suite satisfied');
  });

  it('shows the full suite rejecting the example-only patch, and the evidence for it', () => {
    render(<CodeVerificationDemo />);
    fireEvent.click(screen.getByRole('radio', { name: /Full/ }));
    expect(verdict()).toContain('Not resolved');
    const matrix = screen.getByRole('region', { name: /Closed-interval union: patches against tests/ });
    // the example-only patch leaves two failures, the empty patch three
    expect(within(matrix).getAllByRole('img', { name: /still broken/ })).toHaveLength(5);
    // the verifier opens on the first test the patch still fails
    expect(within(screen.getByLabelText('Selected test evidence')).getByRole('heading').textContent).toBe('Unsorted touching chain');
  });

  it('loads another patch and task from the matrix', () => {
    render(<CodeVerificationDemo />);
    fireEvent.click(screen.getByRole('radio', { name: /Full/ }));
    fireEvent.click(screen.getByRole('button', { name: 'General repair' }));
    expect(verdict()).toContain('Resolved on full suite');
    fireEvent.click(screen.getByRole('radio', { name: 'Stable case-fold deduplication' }));
    expect(screen.getByRole('region', { name: /Stable case-fold deduplication/ })).toBeTruthy();
    expect((screen.getByLabelText('Task') as HTMLSelectElement).value).toBe('unique');
  });
});

describe('verifier', () => {
  const opened = { ...initialConfig('intervals'), candidateId: 'fixed' as const };

  it('does not serialize bundler-dependent function text into the initial HTML', () => {
    expect(renderToStaticMarkup(<Verifier initial={opened} />)).not.toContain('function interval');
  });

  it('replays configuration rather than trusting an imported verdict', async () => {
    render(<Verifier initial={opened} />);
    const report = evaluate({ ...initialConfig(), candidateId: 'empty' });
    const file = { size: 1000, text: async () => JSON.stringify({ ...report, resolved: true }) };
    fireEvent.change(screen.getByLabelText('Import report file'), { target: { files: [file] } });
    await waitFor(() => expect(verdict()).toContain('Not resolved'));
    expect((screen.getByLabelText('Implementation') as HTMLSelectElement).value).toBe('empty');
  });

  it('accepts a maximum-sized export from the bounded assertion editor', async () => {
    render(<Verifier initial={opened} />);
    const input = Array.from({ length: 64 }, (_, i) => `${i}-${'a'.repeat(124)}`);
    const report = evaluate({ ...initialConfig('unique'), mode: 'synthesis', assertions: Array.from({ length: 16 }, (_, i) => ({ id: `large-${i}`, label: 'Bounded assertion', input, expected: input })) });
    const body = JSON.stringify(report, null, 2);
    expect(body.length).toBeGreaterThan(100_000);
    fireEvent.change(screen.getByLabelText('Import report file'), { target: { files: [{ size: body.length, text: async () => body }] } });
    await waitFor(() => expect(screen.getByText('16/16 candidates')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('clears a stale result when the configuration changes, and resets to where it opened', () => {
    render(<Verifier initial={opened} />);
    expect(verdict()).toContain('Resolved on full suite');
    fireEvent.change(screen.getByLabelText('Implementation'), { target: { value: 'overfit' } });
    expect(verdict()).toContain('Not run');
    fireEvent.click(screen.getByRole('button', { name: 'Run verification' }));
    expect(verdict()).toContain('Not resolved');
    fireEvent.click(screen.getByRole('button', { name: 'Reset verifier' }));
    expect(verdict()).toContain('Resolved on full suite');
    expect((screen.getByLabelText('Implementation') as HTMLSelectElement).value).toBe('fixed');
  });

  it('scores authored assertions on buggy and fixed code, and rejects invalid JSON', () => {
    render(<Verifier initial={opened} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test synthesis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run synthesis' }));
    expect(verdict()).toContain('Reproduces');
    fireEvent.click(screen.getByRole('button', { name: 'Clear assertions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run synthesis' }));
    expect(verdict()).toContain('Not resolved');
    fireEvent.change(screen.getByLabelText('Assertion input (JSON)'), { target: { value: 'oops' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add assertion' }));
    expect(screen.getByRole('alert').textContent).toContain('valid JSON');
    fireEvent.change(screen.getByLabelText('Assertion input (JSON)'), { target: { value: '[[0, 2], [2, 7]]' } });
    fireEvent.change(screen.getByLabelText('Expected output (JSON)'), { target: { value: '[[0, 7]]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add assertion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run synthesis' }));
    expect(verdict()).toContain('Reproduces');
  });
});
