import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpeDemo } from './OpeDemo';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const verdict = () => screen.getAllByRole('status')[0].textContent ?? '';
const plot = () => screen.getByRole('figure', { name: /Estimated discounted return/ });

describe('offline policy evaluation demo', () => {
  it('opens on the claim and the control that undercuts it', () => {
    render(<OpeDemo />);
    expect(verdict()).toMatch(/^The target beats the logger by 0\.27/);
    expect(verdict()).toMatch(/A control that never reads the state gets 65% of that gain/);
    const rows = within(plot()).getAllByText(/^(State-responsive target|Constant control|Logging policy)$/);
    expect(rows.map((r) => r.textContent)).toEqual(['State-responsive target', 'Constant control', 'Logging policy']);
  });

  it('loses the gain when the reward drops its gain term', () => {
    render(<OpeDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Gain dropped' }));
    expect(verdict()).toMatch(/^No measurable difference from the logger/);
  });

  it('withholds the target when the logger never intensifies at low load, and says why', () => {
    render(<OpeDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'None at low load' }));
    expect(verdict()).toMatch(/^Withheld: part of the target has no logged evidence\./);
    expect(within(plot()).getAllByText('Withheld')).toHaveLength(2);
    // the logger itself needs no unlogged action, so it is still estimated
    expect(within(plot()).getByText(/^−0\.37$/)).toBeTruthy();
  });

  it('switches estimators without re-running the evaluation', () => {
    render(<OpeDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Raw IS' }));
    expect(screen.getByRole('radio', { name: 'Raw IS' })).toHaveProperty('checked', true);
    expect(verdict()).toMatch(/^The target beats the logger by 0\.30/);
  });

  it('applies full settings only on Evaluate, refuses bad input, and resets', () => {
    render(<OpeDemo />);
    fireEvent.click(screen.getByText('All settings'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Seed' }), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByRole('alert').textContent).toBe('Seed and trajectories must be whole numbers.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Seed' }), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByText(/^Seed 42 · 160 trajectories/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset evaluation' }));
    expect(screen.getByText(/^Seed 2026 · 160 trajectories/)).toBeTruthy();
  });

  it('exports the applied evaluation as JSON', () => {
    const create = vi.fn(() => 'blob:evaluation');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<OpeDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Export evaluation JSON' }));
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledOnce();
  });
});
