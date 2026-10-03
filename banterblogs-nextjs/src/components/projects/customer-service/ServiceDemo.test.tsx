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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const total = () => screen.getByLabelText('Total reward').textContent;
const row = (name: RegExp) => screen.getByRole('button', { name });

describe('customer-service demo', () => {
  it('opens on the wrong refund: the right money, the wrong record, loaded below', () => {
    render(<ServiceDemo />);
    expect(screen.getByText(/Both duplicate-charge trajectories refund \$48\.00/)).toBeTruthy();
    expect(row(/^Refund the first capture: reward −0\.40/).getAttribute('aria-pressed')).toBe('true');
    expect(total()).toBe('−0.40');
    expect(screen.getByRole('img', { name: 'PAY-A: $0.00 kept, $48.00 refunded' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'PAY-B: $48.00 kept, $0.00 refunded' })).toBeTruthy();
    expect(screen.getByText('Effects outside every coherent outcome')).toBeTruthy();
  });

  it('loads any board row into the environment, played to its end', () => {
    render(<ServiceDemo />);
    fireEvent.click(row(/^Refund the second capture/));
    expect(total()).toBe('1.00');
    expect(screen.getByText('A coherent outcome is complete')).toBeTruthy();
    fireEvent.click(row(/^Replace and also refund/));
    expect(total()).toBe('−0.40');
    expect(screen.getByRole('heading', { name: 'Damaged desk lamp' })).toBeTruthy();
  });

  it('runs the workbench by hand: a write without consent is refused and changes nothing', () => {
    render(<ServiceDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'New episode' }));
    expect(screen.getByText('No actions yet.')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Tool' }), { target: { value: 'refund' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run issue refund' }));
    const actions = screen.getByRole('list', { name: 'Actions' });
    expect(within(actions).getByText(/consent_required · no change/)).toBeTruthy();
  });

  it('steps a script from a fresh episode', () => {
    render(<ServiceDemo />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Scripted control' }), { target: { value: 'verified' } });
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    expect(screen.getByText(/^1 of \d+ scripted actions$/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Run script' }));
    expect(total()).toBe('1.00');
  });

  it('refuses a bad configuration and an oversized or forged trace', async () => {
    render(<ServiceDemo />);
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
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON trace' }));
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
