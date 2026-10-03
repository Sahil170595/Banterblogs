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
const openUnderTheHood = () => fireEvent.click(screen.getByText(/^Under the hood/));

describe('offline policy evaluation demo', () => {
  it('opens on the claim and the control that undercuts it', () => {
    render(<OpeDemo />);
    expect(verdict()).toMatch(/^The target beats the logger by 0\.27/);
    expect(verdict()).toMatch(/A control that never reads the state \(the load\) gets 65% of that gain/);
    const rows = within(plot()).getAllByText(/^(State-responsive target|Constant control|Logging policy|Target − logger)$/);
    expect(rows.map((r) => r.textContent)).toEqual(['State-responsive target', 'Constant control', 'Logging policy', 'Target − logger']);
  });

  it('defines its terms before the first control, and says what each row is', () => {
    render(<OpeDemo />);
    const lead = screen.getByText(/^Offline evaluation scores a new policy/);
    expect(lead.textContent).toMatch(/the logging policy, or logger/);
    expect(lead.textContent).toMatch(/passes through 4 decisions/);
    expect(lead.compareDocumentPosition(screen.getAllByRole('radio')[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(plot()).getByText('the new policy: acts more as load rises')).toBeTruthy();
    expect(within(plot()).getByText('the past decisions: what actually happened')).toBeTruthy();
  });

  it('draws the paired difference the verdict reads, against zero, and says higher is better', () => {
    render(<OpeDemo />);
    const difference = within(plot()).getByText('Target − logger').closest('[data-row]')!;
    expect(difference.getAttribute('data-row')).toBe('difference');
    expect(within(difference as HTMLElement).getByText('0.27')).toBeTruthy();
    expect(within(difference as HTMLElement).getByText('0.12 to 0.40')).toBeTruthy();
    expect(plot().textContent).toMatch(/higher is better/);
  });

  it('names the reward and the logger’s support in its own numbers', () => {
    render(<OpeDemo />);
    expect(screen.getByRole('radio', { name: 'Gain − 1.5 × harm' })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: /^Harm ×2/ }).closest('label')!.textContent).toMatch(/penalty 3$/);
    expect(screen.getByText('Rare: the logger chose Intensify 2% of the time at low load, 10% at moderate load and 18% at high load.')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'None at low load' }));
    expect(
      screen.getByText('None at low load: the logger chose Intensify 0% of the time at low load, 10% at moderate load and 18% at high load.'),
    ).toBeTruthy();
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
    // the target, the control and their difference from the logger
    expect(within(plot()).getAllByText('Withheld')).toHaveLength(3);
    // the logger itself needs no unlogged action, so it is still estimated
    expect(within(plot()).getByText(/^−0\.37$/)).toBeTruthy();
  });

  it('switches estimators without re-running the evaluation', () => {
    render(<OpeDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Raw IS' }));
    expect(screen.getByRole('radio', { name: 'Raw IS' })).toHaveProperty('checked', true);
    expect(verdict()).toMatch(/^The target beats the logger by 0\.30/);
  });

  it('says in one line how much data the estimate leans on, and keeps the diagnostics under the hood', () => {
    render(<OpeDemo />);
    expect(screen.getByText('In effect, the estimate leans on 68 of the 160 logged trajectories (its effective sample size).')).toBeTruthy();
    const hood = screen.getByText(/^Under the hood/).closest('details')!;
    expect(hood.open).toBe(false);
    expect(within(hood).getByRole('region', { name: 'Action support' })).toBeTruthy();
    // on a phone each load level is a card, every cell named by its action
    const cells = within(hood).getByRole('region', { name: 'Action support' }).querySelectorAll('td[data-label]');
    expect([...cells].map((c) => c.getAttribute('data-label')).slice(0, 3)).toEqual(['Hold', 'Adjust', 'Intensify']);
  });

  it('applies full settings only on Evaluate, refuses bad input, and resets', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<OpeDemo />);
    openUnderTheHood();
    fireEvent.change(screen.getByRole('textbox', { name: 'Seed' }), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByRole('alert').textContent).toBe('Seed and trajectories must be whole numbers.');
    expect(warn).toHaveBeenCalled();
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
    openUnderTheHood();
    fireEvent.click(screen.getByRole('button', { name: 'Export evaluation JSON' }));
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledOnce();
  });
});
