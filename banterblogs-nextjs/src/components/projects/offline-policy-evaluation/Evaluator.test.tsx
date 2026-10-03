import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Evaluator from './Evaluator';
import { DEFAULT_CONFIG } from '@/lib/projects/offline-policy-evaluation/engine';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('evaluation controls', () => {
  it('applies policy changes, refuses structural gaps, and resets the exact baseline', () => {
    render(<Evaluator />);
    const initial = screen.getByRole('table', { name: /State-responsive target estimator/ }).textContent;
    fireEvent.change(screen.getByLabelText('Logging support'), { target: { value: 'gap' } });
    expect(screen.getByText('Unapplied changes')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByText(/Target values withheld/)).toBeTruthy();
    expect(screen.getByRole('table', { name: /State-responsive target estimator/ }).textContent).not.toBe(initial);
    fireEvent.click(screen.getByRole('button', { name: 'Reset evaluation' }));
    expect(screen.queryByText(/Target values withheld/)).toBeNull();
    expect(screen.getByRole('table', { name: /State-responsive target estimator/ }).textContent).toBe(initial);
    expect((screen.getByLabelText('Logging support') as HTMLSelectElement).value).toBe('rare');
    expect((screen.getByLabelText('Seed') as HTMLInputElement).value).toBe('2026');
  });
  it('does not replace a valid result with invalid configuration', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<Evaluator />);
    const initial = screen.getByRole('table', { name: /State-responsive target estimator/ }).textContent;
    fireEvent.change(screen.getByLabelText('Trajectories'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByRole('alert').textContent).toContain('size');
    expect(errors).toHaveBeenCalledOnce();
    expect(screen.getByRole('table', { name: /State-responsive target estimator/ }).textContent).toBe(initial);
  });
  it('exports the applied result, not unapplied draft controls, and revokes the object URL', async () => {
    const blobs: Blob[] = [];
    const create = vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:test'; });
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<Evaluator />);
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export applied evaluation JSON' }));
    expect(create).toHaveBeenCalledOnce();
    expect(blobs[0].type).toBe('application/json');
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('offline-evaluation-v1-seed-2026.json');
    expect(revoke).toHaveBeenCalledWith('blob:test');
    expect(screen.getByText('JSON exported')).toBeTruthy();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blobs[0]);
    });
    const exported = JSON.parse(data);
    expect(exported.schema).toBe('offline-policy-evaluation/v1');
    expect(exported.config).toEqual(DEFAULT_CONFIG);
    expect(exported.cohort).toHaveLength(DEFAULT_CONFIG.size);
  });
  it('changes estimator and inspected trajectory independently of the applied configuration', () => {
    render(<Evaluator />);
    fireEvent.click(screen.getByRole('button', { name: 'Raw IS' }));
    expect(screen.getByRole('button', { name: 'Raw IS' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(screen.getByLabelText('Inspect trajectory'), { target: { value: '1' } });
    expect(screen.getByRole('table', { name: /Factual steps.*trajectory-2/ })).toBeTruthy();
    expect(screen.queryByText('Unapplied changes')).toBeNull();
  });
});
