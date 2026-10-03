import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, exportTrace, step } from '@/lib/projects/customer-service/engine';
import { scriptedActions } from '@/lib/projects/customer-service/scripts';
import { ServiceDemo } from './ServiceDemo';

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
  vi.unstubAllGlobals();
});

const total = () => screen.getByLabelText('Total reward').textContent;
const row = (name: RegExp) => screen.getByRole('button', { name });
const openHood = () => fireEvent.click(screen.getByText(/^Run it yourself/));

describe('customer-service demo', () => {
  it('opens on the wrong refund: the right money, the wrong record, loaded below', () => {
    render(<ServiceDemo />);
    expect(screen.getByText(/10 scripted trajectories, each a fixed sequence of agent actions, through 5 support cases/)).toBeTruthy();
    expect(row(/^Refund the first capture: reward −0\.40, not resolved/).getAttribute('aria-pressed')).toBe('true');
    expect(total()).toBe('−0.40');
    expect(screen.getByRole('img', { name: 'PAY-A: $0.00 kept, $48.00 refunded' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'PAY-B: $48.00 kept, $0.00 refunded' })).toBeTruthy();
    expect(screen.getByText('Effects outside every coherent outcome')).toBeTruthy();
    expect(screen.getByText(/its effects fit none of the acceptable outcomes, so the reward is held at −0\.40 or below/)).toBeTruthy();
    // the trace names the capture it refunded
    expect(within(screen.getByRole('list', { name: 'Actions' })).getByText('Issue refund: $48.00 on PAY-A (first capture)')).toBeTruthy();
  });

  // re-review: the trace said "The world supports this report" beside a 0%
  // supported report and a branch tagged "no supported report"
  it('keeps a true report apart from report credit, and says what the evidence share counts', () => {
    render(<ServiceDemo />);
    expect(screen.queryByText(/supports this report/)).toBeNull();
    const actions = screen.getByRole('list', { name: 'Actions' });
    expect(within(actions).getByText(/True when made/)).toBeTruthy();
    const branch = screen.getByText('Refund redundant capture').parentElement!;
    expect(branch.textContent).toMatch(/report not credited: this outcome was never reached/);
    expect(branch.textContent).toMatch(/\d+% of its required steps done/);
    // a report is not a read: its panel says what kind of action it is
    fireEvent.click(within(actions).getByRole('button', { name: /Report: Refund issued/ }));
    expect(screen.getByText(/^#5 · report: changes no order record$/)).toBeTruthy();
    expect(screen.queryByText(/#5 · read impact/)).toBeNull();
  });

  it('labels the order status strip as a status, not a row of tabs', () => {
    render(<ServiceDemo />);
    const strip = screen.getByRole('list', { name: /^Order S-410:/ });
    expect(strip.previousElementSibling?.textContent).toBe('Order status');
    expect(within(strip).queryAllByRole('button')).toHaveLength(0);
  });

  it('counts actions and effects in words that agree with the number', () => {
    render(<ServiceDemo />);
    expect(row(/^Report a refund, issue none: reward −0\.30, not resolved, 1 action, 0 effects/)).toBeTruthy();
    expect(row(/^Return and replace: reward 1\.00, resolved, 6 actions, 2 effects/)).toBeTruthy();
  });

  it('loads any board row into the environment, played to its end, and brings it into view', async () => {
    render(<ServiceDemo />);
    revealResult.mockClear();
    fireEvent.click(row(/^Refund the second capture/));
    expect(total()).toBe('1.00');
    expect(screen.getByText('A coherent outcome is complete')).toBeTruthy();
    await waitFor(() => expect(revealResult).toHaveBeenCalledOnce());
    // the revealed element is the environment: the case brief and its trace
    const revealed = revealResult.mock.calls[0][0] as HTMLElement;
    expect(revealed.contains(screen.getByRole('heading', { name: 'Two full captures', level: 3 }))).toBe(true);
    expect(revealed.contains(screen.getByRole('list', { name: 'Actions' }))).toBe(true);
    fireEvent.click(row(/^Replace and also refund/));
    expect(total()).toBe('−0.40');
    expect(screen.getByRole('heading', { name: 'Damaged desk lamp' })).toBeTruthy();
  });

  // re-review: after a scripted trajectory the form kept its defaults (PAY-B,
  // a replacement) while the trace showed a refund of PAY-A
  it('starts the workbench from what the loaded trajectory chose and reported', () => {
    render(<ServiceDemo />);
    openHood();
    expect((screen.getByRole('combobox', { name: 'Payment' }) as HTMLSelectElement).value).toBe('PAY-A');
    expect((screen.getByRole('combobox', { name: 'Customer choice (scripted)' }) as HTMLSelectElement).value).toBe('refund');
    expect((screen.getByRole('combobox', { name: 'Agent report' }) as HTMLSelectElement).value).toBe('refunded');
    fireEvent.click(row(/^Return and replace/));
    expect((screen.getByRole('combobox', { name: 'Customer choice (scripted)' }) as HTMLSelectElement).value).toBe('replace');
    expect((screen.getByRole('combobox', { name: 'Agent report' }) as HTMLSelectElement).value).toBe('replacement-created');
  });

  it('runs the workbench by hand: a write without consent is refused and changes nothing', () => {
    render(<ServiceDemo />);
    openHood();
    fireEvent.click(screen.getByRole('button', { name: 'New episode' }));
    expect(screen.getByText('No actions yet.')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Tool' }), { target: { value: 'refund' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run issue refund' }));
    const actions = screen.getByRole('list', { name: 'Actions' });
    expect(within(actions).getByText(/Refused: no customer choice matches this write/)).toBeTruthy();
    expect(within(actions).getByText('consent_required')).toBeTruthy();
  });

  it('glosses a malformed call instead of showing the parser’s wording', () => {
    render(<ServiceDemo />);
    openHood();
    fireEvent.change(screen.getByRole('combobox', { name: 'Scripted control' }), { target: { value: 'foreign' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run script' }));
    const actions = screen.getByRole('list', { name: 'Actions' });
    expect(within(actions).getByText(/Refused: arguments the tool does not accept/)).toBeTruthy();
    expect(within(actions).queryByText(/Unrecognized key/)).toBeNull();
    expect(screen.getByText('Refused: arguments the tool does not accept.')).toBeTruthy();
  });

  it('steps a script from a fresh episode', () => {
    render(<ServiceDemo />);
    openHood();
    fireEvent.change(screen.getByRole('combobox', { name: 'Scripted control' }), { target: { value: 'verified' } });
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    expect(screen.getByText(/^1 of \d+ scripted actions$/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Run script' }));
    expect(total()).toBe('1.00');
  });

  it('refuses a bad configuration and an oversized or forged trace', async () => {
    render(<ServiceDemo />);
    openHood();
    fireEvent.change(screen.getByRole('textbox', { name: 'Order total (cents)' }), { target: { value: '4801' } });
    fireEvent.click(screen.getByRole('button', { name: 'New episode' }));
    expect(screen.getByRole('alert').textContent).toMatch(/even number of cents/);

    // jsdom's File has no text(); a browser's does
    const upload = (body: unknown) => {
      const text = JSON.stringify(body);
      fireEvent.change(screen.getByLabelText('Trace file'), { target: { files: [{ size: text.length, text: async () => text }] } });
    };
    // the verified damaged-lamp remedy leaves one replacement; a receipt without it is forged
    const session = scriptedActions(createSession().config, 'verified').reduce(step, createSession());
    const trace = exportTrace(session);
    upload({ ...trace, final: { ...trace.final, replacements: [] } });
    await waitFor(() => expect(screen.getAllByRole('alert').some((a) => /Replay mismatch/.test(a.textContent ?? ''))).toBe(true));

    upload(trace);
    await waitFor(() => expect(screen.getByLabelText('Total reward').textContent).toBe('1.00'));
  });

  it('exports the episode as JSON', () => {
    const create = vi.fn(() => 'blob:trace');
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ServiceDemo />);
    openHood();
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON trace' }));
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
