import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Evaluator from './Evaluator';
import { DEFAULT_CONFIG } from '@/lib/projects/offline-policy-evaluation/engine';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('evaluation controls', () => {
  it('exposes a compact settings disclosure without resetting configuration', () => {
    render(<Evaluator />);
    const toggle = screen.getByRole('button', { name: 'Evaluation settings' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '42' } });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect((screen.getByLabelText('Seed') as HTMLInputElement).value).toBe('42');
  });
  it('renders SVG coordinates at stable presentation precision for hydration', () => {
    const { container } = render(<Evaluator />);
    const attributes = ['x1', 'x2', 'cx', 'y', 'height'];
    for (const element of container.querySelectorAll('svg line, svg circle, svg rect')) {
      for (const attribute of attributes) {
        const value = element.getAttribute(attribute);
        if (value !== null) expect(value).toMatch(/^-?\d+(?:\.\d{1,3})?$/);
      }
    }
  });
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
  it('labels a known reachable gap separately from zero empirical mass in the seed-38 sample', () => {
    render(<Evaluator />);
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '38' } });
    fireEvent.change(screen.getByLabelText('Trajectories'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Logging support'), { target: { value: 'gap' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    const warning = screen.getByText(/Target values withheld/).textContent;
    expect(warning).toContain('intervals withheld');
    expect(warning).toContain('known reachable contexts');
    expect(warning).toContain('0.0% empirical');
    expect(warning).toContain('17.1% conditional');
    const table = screen.getByRole('table', { name: /State-responsive target estimator/ });
    expect(table.textContent).toContain('Unavailable');
    expect(table.textContent).not.toContain('2.01');
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
