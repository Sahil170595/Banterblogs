import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowDemo } from './WorkflowDemo';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

// jsdom lays nothing out and has no scrolling or media queries; picking an
// attempt reveals the app below (reveal.ts)
const scrolled = vi.fn();
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  Element.prototype.scrollIntoView = scrolled;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  scrolled.mockReset();
});

// a full run waits out the 500 ms save and the 400 ms pause before it starts
const RUN_TIMEOUT = { timeout: 4000 };
// longer than the pause before an automatic run would start
const PAST_AUTO_RUN_MS = 600;
const status = () => screen.getByRole('status', { name: 'Workflow status' });
const attempt = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) });
const evidence = () => screen.getByRole('region', { name: 'What each kind of evidence says' });

describe('workflow demo', () => {
  it('opens on the computed verdicts with the normal attempt loaded and waiting', () => {
    render(<WorkflowDemo />);
    expect(
      screen.getByText(
        /6 attempts to book North lab for “Spectral scan”, and only one saved the booking that was asked for\. Only the completion gate gets every attempt right\./,
      ),
    ).toBeTruthy();
    // the record column, the truth the checks are read against, comes first
    expect(
      within(evidence())
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual([
      'Attempt',
      'Saved as askeda committed record with the requested title and room',
      'Success notice"Reservation saved" shown',
      "Parallax's checkmy earlier agent",
      "Completion gatethis rebuild's check",
    ]);
    // a wrong verdict says so in words, not colour alone
    expect(within(evidence()).getAllByText('wrong')).toHaveLength(6);
    expect(within(evidence()).getAllByLabelText('Success notice: done, wrong')).toHaveLength(2);
    expect(within(evidence()).getAllByLabelText("Parallax's check: done, wrong")).toHaveLength(4);
    expect(within(evidence()).queryAllByLabelText(/Completion gate: .*wrong/)).toHaveLength(0);
    expect(attempt('Saves normally').getAttribute('aria-pressed')).toBe('true');
    expect(status().textContent).toContain('Ready');
  });

  it('runs a picked attempt and fails the notice that saved nothing', async () => {
    render(<WorkflowDemo />);
    fireEvent.click(attempt('Notice shown, nothing saved'));
    expect(attempt('Notice shown, nothing saved').getAttribute('aria-pressed')).toBe('true');
    // the app the attempt runs in is brought into view and marked
    expect(scrolled).toHaveBeenCalled();
    expect(screen.getByText('Loaded in the app').parentElement!.parentElement!.classList.contains('demo-revealed')).toBe(true);
    await waitFor(() => expect(status().textContent).toContain('Not done: no committed record'), RUN_TIMEOUT);
    expect(screen.getByRole('status', { name: 'Fixture notice' }).textContent).toContain('Reservation saved');
    expect(screen.queryByRole('row', { name: /Spectral scan/ })).toBeNull();
  });

  it('loads the wrong room for a person to make, without running the executor', async () => {
    render(<WorkflowDemo />);
    // what it commits is in the table: a record, in the wrong room
    expect(within(evidence()).getByLabelText('Saved as asked: South lab, wrong room')).toBeTruthy();
    fireEvent.click(attempt('Saved to the wrong room'));
    expect(screen.getByText(/never picks the wrong room/)).toBeTruthy();
    // the executor would book the requested room, so it cannot run this one
    expect(screen.getByRole('button', { name: 'Run workflow' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Step' }).hasAttribute('disabled')).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, PAST_AUTO_RUN_MS));
    // Run is off, so the status says what to do instead of "Ready to run"
    expect(status().textContent).toContain('Make it by hand');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // live QA #19: changed settings left the table and the label claiming the old attempt
  it('calls the app’s load your own settings once they depart from the attempt', () => {
    render(<WorkflowDemo />);
    const hood = screen.getByText('Settings, the action plan and the step-by-step trace').closest('details')!;
    hood.open = true;
    fireEvent.change(screen.getByLabelText('Requested room'), { target: { value: 'south' } });
    expect(screen.getByText('Loaded in the app').parentElement!.textContent).toMatch(/Your own settings: book South lab for “Spectral scan”/);
    expect(within(evidence()).queryAllByRole('button', { pressed: true })).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Requested room'), { target: { value: 'north' } });
    expect(attempt('Saves normally').getAttribute('aria-pressed')).toBe('true');
  });

  // live QA #26: picking an attempt closed the settings a visitor had open
  it('keeps the settings open across a pick', async () => {
    render(<WorkflowDemo />);
    const hood = () => screen.getByText('Settings, the action plan and the step-by-step trace').closest('details')!;
    hood().open = true;
    fireEvent(hood(), new Event('toggle'));
    fireEvent.click(attempt('Save rejected'));
    await waitFor(() => expect(hood().open).toBe(true));
  });

  // live QA #29: the opening attempt ran by itself under reduced motion, and over settings a visitor had chosen
  it('runs the opening attempt on sight only when motion is allowed and nothing has been chosen', async () => {
    let seeIt = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          seeIt = () => callback([{ isIntersecting: true }]);
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<WorkflowDemo />);
    // the stub's matchMedia answers yes to every query, reduced motion included
    act(() => seeIt());
    await new Promise((resolve) => setTimeout(resolve, PAST_AUTO_RUN_MS));
    expect(status().textContent).toContain('Ready');
  });

  // live QA #22: on a phone the verdict of a save by hand landed under the sticky header
  it('brings the verdict of a save by hand into view', async () => {
    render(<WorkflowDemo />);
    fireEvent.click(attempt('Saved to the wrong room'));
    scrolled.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Reserve slot' }));
    fireEvent.input(screen.getByLabelText('Reservation title'), { target: { value: 'Spectral scan' } });
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: 'south' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reservation' }));
    await waitFor(() => expect(status().textContent).toContain('Not done: the record is in the wrong room'), RUN_TIMEOUT);
    expect(scrolled.mock.contexts).toContain(status());
  });

  it('judges a booking made by hand with the completion gate', async () => {
    render(<WorkflowDemo />);
    fireEvent.click(attempt('Saved to the wrong room'));
    fireEvent.click(screen.getByRole('button', { name: 'Reserve slot' }));
    fireEvent.input(screen.getByLabelText('Reservation title'), { target: { value: 'Spectral scan' } });
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: 'south' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reservation' }));
    await waitFor(() => expect(status().textContent).toContain('Not done: the record is in the wrong room'), RUN_TIMEOUT);
  });
});
