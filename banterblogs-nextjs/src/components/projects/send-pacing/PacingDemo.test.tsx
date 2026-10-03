import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeReceipt } from '@/lib/projects/send-pacing/receipt';
import { SOURCE_REPLAY } from '@/lib/projects/send-pacing/scheduler';
import type { SweepRow } from '@/lib/projects/send-pacing/sweep';
import { PacingDemo } from './PacingDemo';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

// jsdom lays nothing out and has no scrollIntoView or matchMedia; a picked
// setup reveals the chart through both (components/projects/reveal.ts)
const scrollIntoView = vi.fn();
beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  scrollIntoView.mockClear();
});

// a small stand-in sweep; the real one is computed on the server and tested in lib
const SWEEP: SweepRow[] = [
  {
    label: 'the source replay: 12 over 2 hours from 09:00',
    replay: { count: 12, durationHours: 2, startHour: 9 },
    beforePreparation: 10,
    lastTwoLate: 10,
    burst: 1,
    afterHours: 0,
    atEnd: 3,
    atClose: 0,
    closeHour: null,
  },
  {
    label: '12 over 2 hours from 16:00',
    replay: { count: 12, durationHours: 2, startHour: 16 },
    beforePreparation: 10,
    lastTwoLate: 10,
    burst: 9,
    afterHours: 0,
    atEnd: 0,
    atClose: 6.5,
    closeHour: 17,
  },
];
const ledger = () => screen.getByRole('region', { name: 'Message ledger' });
const file = (body: unknown) => ({ size: 100, text: async () => JSON.stringify(body) });

describe('send pacing demo', () => {
  it('opens on seed 7 of the source replay with its last two sends flagged', () => {
    render(<PacingDemo sweep={SWEEP} seeds={10} />);
    expect(
      screen.getByText(
        'In this run of 12 messages, two go out before they could have been typed, and three land on the campaign’s final instant, 11:00.',
      ),
    ).toBeTruthy();
    expect(within(ledger()).getAllByText('sent before it could be typed')).toHaveLength(2);
    expect(screen.getByText(/two sent before they were typed · three at the campaign's final instant/)).toBeTruthy();
    expect(
      screen.getByText(/Three messages go at the same instant, 11:00, the campaign’s end: anything scheduled past it is clamped back to it\./),
    ).toBeTruthy();
    expect(screen.getByText('planned slot, hidden under the tick when sent on schedule')).toBeTruthy();
  });

  it('titles the sweep and names every value’s column, so a phone can stack each row as a card', () => {
    render(<PacingDemo sweep={SWEEP} seeds={10} />);
    expect(screen.getByRole('heading', { name: 'What 10 random runs find for each setup' })).toBeTruthy();
    for (const region of [screen.getByRole('region', { name: 'What 10 seeds find' }), ledger()]) {
      for (const cell of within(region).getAllByRole('cell')) expect(cell.getAttribute('data-label')).toBeTruthy();
    }
    expect(
      within(ledger())
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Message', 'Typing starts', 'Typing time', 'Typed by', 'Planned', 'Sent', 'Margin', 'Audit']);
  });

  it('steps seeds, and a sweep row charts its setup above', () => {
    render(<PacingDemo sweep={SWEEP} seeds={10} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next seed' }));
    expect(screen.getByLabelText('Seed')).toHaveProperty('value', '8');
    fireEvent.click(screen.getByRole('button', { name: '12 over 2 hours from 16:00' }));
    expect(screen.getByText(/16:00 to 18:00 UTC/)).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalled();
    // the close of business is drawn, and the pile at it said in words
    expect(screen.getByText('business hours end, 17:00')).toBeTruthy();
    expect(screen.getByText(/at the same instant, 17:00, when business hours close/)).toBeTruthy();
  });

  // its 0.0 at the campaign's end is no all-clear: the pile moved to 17:00
  it('says where the 16:00 setup’s pile goes, beside its zero at the campaign end', () => {
    render(<PacingDemo sweep={SWEEP} seeds={10} />);
    const row = screen.getByRole('button', { name: '12 over 2 hours from 16:00' }).closest('tr')!;
    expect(row.querySelector('[data-label="Messages at the final instant, average per run"]')!.textContent).toBe(
      '0.0, but 6.5 a run pile at 17:00, when business hours close',
    );
  });

  it('spells counts under ten and gives larger ones as digits, in one style', () => {
    render(<PacingDemo sweep={SWEEP} seeds={10} />);
    fireEvent.click(screen.getByRole('button', { name: '12 over 2 hours from 16:00' }));
    // seed 10 of this setup sends six before they are typed
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '10' } });
    const line = screen.getByText(/^Seed 10/).closest('p')!.textContent!;
    expect(line).toMatch(/six sent before they were typed/);
    expect(line).not.toMatch(/ [0-9] (sent before|at the)/);
  });

  it('keeps the run while the seed field is cleared', () => {
    render(<PacingDemo sweep={SWEEP} seeds={10} />);
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '' } });
    expect(screen.getByText(/^Seed 7/)).toBeTruthy();
  });

  it('reruns an imported replay and refuses a forged one', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<PacingDemo sweep={SWEEP} seeds={10} />);
    fireEvent.change(screen.getByLabelText('Replay file'), { target: { files: [file(makeReceipt({ ...SOURCE_REPLAY, seed: 42 }))] } });
    await waitFor(() => expect(screen.getByLabelText('Seed')).toHaveProperty('value', '42'));
    const forged = makeReceipt(SOURCE_REPLAY);
    forged.sendTimes[3] = '2030-01-07T09:00:00+00:00';
    fireEvent.change(screen.getByLabelText('Replay file'), { target: { files: [file(forged)] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/do not follow/));
    expect(warn).toHaveBeenCalled();
  });
});

const tools = () => screen.getByText('Change the campaign, read every message’s timing, export a replay').closest('details')!;

describe('send pacing demo, after live QA', () => {
  // abc, -1, 1.5 or 99999999999 sat in the box beside "Seed 7" with no word, then reverted
  it('says a seed must be a whole number in range, and which seed it kept', () => {
    render(<PacingDemo sweep={SWEEP} seeds={10} />);
    const seed = screen.getByLabelText('Seed');
    fireEvent.change(seed, { target: { value: 'abc' } });
    expect(screen.getByText(/Seed must be a whole number from 0 to 4,294,967,295/)).toBeTruthy();
    expect(screen.getByText(/^Seed 7/)).toBeTruthy();
    fireEvent.blur(seed);
    expect(seed).toHaveProperty('value', '7');
    expect(screen.getByText(/kept seed 7/)).toBeTruthy();
    fireEvent.change(seed, { target: { value: '1.5' } });
    fireEvent.keyDown(seed, { key: 'Enter' });
    expect(seed).toHaveProperty('value', '7');
    fireEvent.change(seed, { target: { value: '9' } });
    expect(screen.queryByText(/Seed must be a whole number/)).toBeNull();
  });

  it('answers an import beside its button, in plain words, without the last success under it', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<PacingDemo sweep={SWEEP} seeds={10} />);
    fireEvent.change(screen.getByLabelText('Replay file'), { target: { files: [file(makeReceipt(SOURCE_REPLAY))] } });
    await waitFor(() => expect(within(tools()).getByText(/File rerun/)).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Replay file'), { target: { files: [file([1, 2, 3])] } });
    await waitFor(() => expect(within(tools()).getByRole('alert').textContent).toBe('File refused: The file should hold an object, not an array.'));
    expect(within(tools()).queryByText(/File rerun/)).toBeNull();
  });

  // a change under the hood redrew the chart 1,800 px above, and nothing in view said so
  it('reads the run back beside the campaign settings', () => {
    render(<PacingDemo sweep={SWEEP} seeds={10} />);
    const line = screen.getByTestId('campaign-verdict');
    expect(line.closest('details')).toBe(tools());
    expect(line.textContent).toMatch(/12 messages/);
    fireEvent.change(screen.getByLabelText('Messages'), { target: { value: '24' } });
    expect(line.textContent).toMatch(/24 messages/);
  });
});
