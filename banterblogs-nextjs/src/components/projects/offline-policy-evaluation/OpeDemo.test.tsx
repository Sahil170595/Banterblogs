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
  it('opens on the claim and the control that undercuts it, in one line', () => {
    render(<OpeDemo />);
    const headline = screen.getAllByRole('status')[0].querySelector('p')!.textContent!;
    expect(headline).toMatch(/^On its face the target beats the logger by 0\.27/);
    expect(headline).toMatch(/but a control that never reads the state \(the load\) gets 65% of that gain/);
    expect(verdict()).toMatch(/target − control, is 0\.10 \(paired 95% interval 0\.03 to 0\.17\)/);
    const rows = within(plot()).getAllByText(/^(State-responsive target|Constant control|Logging policy|Target − logger)$/);
    expect(rows.map((r) => r.textContent)).toEqual(['State-responsive target', 'Constant control', 'Logging policy', 'Target − logger']);
  });

  it('defines its terms before the first control, and says what each row is', () => {
    render(<OpeDemo />);
    const lead = screen.getByText(/^Offline evaluation scores a new policy/);
    expect(lead.textContent).toMatch(/a new policy, the target,/);
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
    expect(screen.getByText(/^Rare: the logger chose Intensify 2% of the time at low load, 10% at moderate load and 18% at high load\./)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'None at low load' }));
    expect(
      screen.getByText(/^None at low load: the logger chose Intensify 0% of the time at low load, 10% at moderate load and 18% at high load\./),
    ).toBeTruthy();
    // re-review: Broad read as more coverage alone; it changes the logged decisions, so the logger's own return moves
    expect(screen.getByText(/changes the past decisions themselves, so the logger’s own return moves too/)).toBeTruthy();
  });

  it('spells out IS and names each estimator for what it computes', () => {
    render(<OpeDemo />);
    expect(screen.getByRole('group', { name: /importance sampling \(IS\)/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Capped self-normalized IS' })).toBeTruthy();
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
    // with no estimate there is no data the estimate leans on
    expect(screen.queryByText(/the estimate leans on/)).toBeNull();
  });

  it('switches estimators without re-running the evaluation', () => {
    render(<OpeDemo />);
    fireEvent.click(screen.getByRole('radio', { name: 'Raw IS' }));
    expect(screen.getByRole('radio', { name: 'Raw IS' })).toHaveProperty('checked', true);
    expect(verdict()).toMatch(/^On its face the target beats the logger by 0\.30/);
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

  // live QA: Chrome named none of the six sliders; the <output> inside each label took the label
  it('names every slider by its label', () => {
    render(<OpeDemo />);
    openUnderTheHood();
    const names = ['Intervention probability', 'Load responsiveness', 'Blend toward the logger', 'Gain coefficient', 'Harm penalty', 'Discount'];
    for (const name of names) expect(screen.getByRole('slider', { name })).toBeTruthy();
  });

  // live QA: "size: Number must be greater than or equal to 8", and no limits on screen
  it('refuses settings in the form’s own words, and states the limits', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<OpeDemo />);
    openUnderTheHood();
    expect(screen.getByText(/^Seed 0–4,294,967,295; trajectories 8–320\./)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Trajectories' }), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByRole('alert').textContent).toBe('Trajectories should be at least 8.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Trajectories' }), { target: { value: '160' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Seed' }), { target: { value: '5000000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByRole('alert').textContent).toBe('Seed should be at most 4294967295.');
    expect(warn).toHaveBeenCalled();
  });

  // live QA: moving a slider and then a preset above threw the slider's value away
  it('keeps an unapplied setting through a preset, and says it is not applied', () => {
    render(<OpeDemo />);
    openUnderTheHood();
    fireEvent.change(screen.getByRole('slider', { name: 'Intervention probability' }), { target: { value: '0.9' } });
    expect(screen.getByText(/^Not applied yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Broad' }));
    expect((screen.getByRole('slider', { name: 'Intervention probability' }) as HTMLInputElement).value).toBe('0.9');
    expect(screen.getByText(/^Not applied yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.queryByText(/^Not applied yet/)).toBeNull();
    expect((screen.getByRole('slider', { name: 'Intervention probability' }) as HTMLInputElement).value).toBe('0.9');
  });

  // live QA: Reset evaluation brought back the trajectory chosen before it
  it('resets the ledger to the first trajectory', () => {
    render(<OpeDemo />);
    openUnderTheHood();
    fireEvent.change(screen.getByRole('combobox', { name: 'Trajectory' }), { target: { value: '149' } });
    expect(screen.getByRole('region', { name: 'Ledger for trajectory 150' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset evaluation' }));
    expect(screen.getByRole('region', { name: 'Ledger for trajectory 1' })).toBeTruthy();
  });

  // live QA: the radio said "Raw IS" and the table "Raw per-decision IS"
  it('names each estimator the same in the table as on its radio', () => {
    render(<OpeDemo />);
    const radios = within(screen.getByRole('group', { name: /importance sampling \(IS\)/ })).getAllByRole('radio');
    const names = radios.map((radio) => radio.closest('label')!.textContent);
    const rows = within(screen.getByRole('region', { name: 'Estimator audit' })).getAllByRole('rowheader');
    expect(rows.map((row) => row.textContent)).toEqual(names);
  });

  it('applies full settings only on Evaluate, refuses bad input, and resets', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<OpeDemo />);
    openUnderTheHood();
    fireEvent.change(screen.getByRole('textbox', { name: 'Seed' }), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByRole('alert').textContent).toBe('Seed should be a whole number.');
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
    // live QA: the export line stayed on under later changes and a later refusal
    const notice = () => screen.getByRole('status', { name: 'Export' }).textContent;
    expect(notice()).toBe('Evaluation exported.');
    fireEvent.click(screen.getByRole('radio', { name: 'Gain dropped' }));
    expect(notice()).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Export evaluation JSON' }));
    expect(notice()).toBe('Evaluation exported.');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fireEvent.change(screen.getByRole('textbox', { name: 'Trajectories' }), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(notice()).toBe('');
  });
});
