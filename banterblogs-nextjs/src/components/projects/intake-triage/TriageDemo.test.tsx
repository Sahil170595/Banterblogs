import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeInfluence } from '@/lib/projects/intake-triage/influence';
import { makeReceipt } from '@/lib/projects/intake-triage/receipt';
import { NEUTRAL_SIGNALS } from '@/lib/projects/intake-triage/signals';
import { TriageDemo } from './TriageDemo';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

// jsdom lays nothing out and has no scrolling or media queries; loading an
// example reveals the scorer below (reveal.ts)
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

const REPORT = analyzeInfluence();
const priority = () => screen.getByLabelText('Priority').textContent;
const group = (legend: string) => screen.getByRole('group', { name: legend });
const file = (body: unknown) => ({ size: 100, text: async () => JSON.stringify(body) });

describe('intake triage demo', () => {
  it('opens on the counted claims and a same-day reschedule the source also scored P1', () => {
    render(<TriageDemo report={REPORT} />);
    expect(
      screen.getByText(/Across all 12,672 combinations of them, urgent wording never changes it, and once a safety gate fires, no operational signal does\./),
    ).toBeTruthy();
    expect(priority()).toBe('P1');
    expect(screen.getByText(/Same as Intakegate's own scorer: P1, scheduling\./)).toBeTruthy();
  });

  it('defines its terms before the table and leads with the signal that never moves a priority', () => {
    render(<TriageDemo report={REPORT} />);
    expect(screen.getByText(/P0 is the most urgent priority, escalated for same-hour review; P3 is the lowest\./)).toBeTruthy();
    const table = screen.getByRole('region', { name: 'What each signal can change' });
    expect(within(table).getAllByRole('rowheader')[0].textContent).toContain('Urgent wording');
    // every count keeps its denominator in view
    expect(within(table).getAllByRole('columnheader')[1].textContent).toContain('in this many of 12,672 combinations');
  });

  it('shows that neither same-day signal alone decides, while the required action does', () => {
    render(<TriageDemo report={REPORT} />);
    // an option's note names the priority choosing it would give; none here
    expect(within(group('Same-day wording')).getByRole('radio', { name: 'No' })).toBeTruthy();
    expect(within(group('Action required')).getByRole('radio', { name: 'No, P2' })).toBeTruthy();
    fireEvent.click(within(group('Same-day wording')).getByRole('radio', { name: 'No' }));
    expect(priority()).toBe('P1');
    fireEvent.click(within(group('Action required')).getByRole('radio', { name: /No/ }));
    expect(priority()).toBe('P2');
  });

  it('loads an example with its deciding signal marked, and brings the scorer into view', () => {
    render(<TriageDemo report={REPORT} />);
    fireEvent.click(screen.getByRole('button', { name: /Load the example for Concern is about caregiving: off to on moves P1 to P0/ }));
    expect(scrolled).toHaveBeenCalled();
    expect(priority()).toBe('P1');
    const caregiving = group('Concern is about caregiving');
    expect(caregiving.closest('[data-focus]')).toBeTruthy();
    fireEvent.click(within(caregiving).getByRole('radio', { name: /Yes/ }));
    expect(priority()).toBe('P0');
    expect(screen.getByText('Not summed: a safety gate decided first.')).toBeTruthy();
  });

  it('rescores an imported file and refuses one whose decision does not follow', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<TriageDemo report={REPORT} />);
    const spam = { ...NEUTRAL_SIGNALS, regex: { ...NEUTRAL_SIGNALS.regex, spam_hit: true } };
    fireEvent.change(screen.getByLabelText('Signals file'), { target: { files: [file(makeReceipt(spam))] } });
    await waitFor(() => expect(priority()).toBe('P3'));
    const forged = makeReceipt(spam);
    forged.decision.urgency = 'P1';
    fireEvent.change(screen.getByLabelText('Signals file'), { target: { files: [file(forged)] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/urgency does not follow/));
    expect(priority()).toBe('P3');
    expect(warn).toHaveBeenCalled();
  });
});
