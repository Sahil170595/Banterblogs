import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkflowDemo } from './WorkflowDemo';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
      screen.getByText(/Of these 6 attempts, a success notice claims 3 saved the reservation and Parallax's completion check accepts 5\. One did\./),
    ).toBeTruthy();
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
    await waitFor(() => expect(status().textContent).toContain('Failed'), RUN_TIMEOUT);
    expect(screen.getByRole('status', { name: 'Fixture notice' }).textContent).toContain('Reservation saved');
    expect(screen.queryByRole('row', { name: /Spectral scan/ })).toBeNull();
  });

  it('loads the wrong room for a person to make, without running the executor', async () => {
    render(<WorkflowDemo />);
    fireEvent.click(attempt('Saved to the wrong room'));
    expect(screen.getByText(/never picks the wrong room/)).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, PAST_AUTO_RUN_MS));
    expect(status().textContent).toContain('Ready');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
