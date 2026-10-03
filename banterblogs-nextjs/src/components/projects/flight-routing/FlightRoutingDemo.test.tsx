import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TIGHT_CONFIG } from '@/lib/projects/flight-routing/experiment';
import { evaluateWorlds } from '@/lib/projects/flight-routing/worlds';
import { deadlineNote, gridHeadline, profileNote } from './copy';
import { FlightRoutingDemo } from './FlightRoutingDemo';

// ViewTransition ships in the React canary Next bundles; the npm React these
// tests run on has none, so it renders its children.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, ViewTransition: ({ children }: { children: import('react').ReactNode }) => children };
});

const { revealResult } = vi.hoisted(() => ({ revealResult: vi.fn() }));
vi.mock('../reveal', () => ({ revealResult }));

// a failed export test must not leave its spies on the next one
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const initialWorlds = evaluateWorlds(TIGHT_CONFIG);
const renderDemo = () => render(<FlightRoutingDemo initialWorlds={initialWorlds} />);
const panel = (name: RegExp) => screen.getByRole('group', { name });
const status = () => screen.getByTestId('episode-status').textContent;
const openUnderTheHood = () => fireEvent.click(screen.getByText(/^Under the hood/));

describe('flight routing demo', () => {
  it('opens on the finding: the tight deadline, every policy over the same 64 worlds', () => {
    renderDemo();
    expect(screen.getByRole('radio', { name: /07:55/ })).toHaveProperty('checked', true);
    expect(within(panel(/^Nonstop first: 0 of 64/)).getAllByRole('button')).toHaveLength(64);
    expect(panel(/^Deadline lookahead: 40 of 64/)).toBeTruthy();
    // the replay below opens on world 1 under lookahead, already played out
    expect(status()).toBe('Arrived on time');
    expect(screen.getByRole('button', { name: /World 1, seed 42/, pressed: true })).toBeTruthy();
  });

  it('says in plain words what the panels show, before the panels', () => {
    const { container } = renderDemo();
    const headline = screen.getByText(gridHeadline(initialWorlds));
    expect(headline.textContent).toBe(
      'Deadline lookahead is on time in 40 of 64 worlds, Nonstop first in 0. Lookahead gets 8 fewer passengers there at all (54 against 62).',
    );
    const key = screen.getByRole('list', { name: 'Square key' });
    const firstPanel = panel(/^Nonstop first/);
    // the headline and the key come before the squares they explain
    expect(headline.compareDocumentPosition(firstPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(key.compareDocumentPosition(firstPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // every policy says what it does under its name
    expect(container.textContent).toContain('Takes whichever flight lands soonest, wherever it goes.');
    expect(screen.getByText(/the earliest nonstop to the destination/)).toBeTruthy();
  });

  it('explains the deadline and the disruptions in terms of the fixture', () => {
    renderDemo();
    // the network has two nonstops; a deadline is measured against the earlier, F3
    expect(deadlineNote(TIGHT_CONFIG.deadline, TIGHT_CONFIG)).toBe('5 min before the first nonstop, F3, lands');
    expect(deadlineNote(540, TIGHT_CONFIG)).toBe('an hour after the first nonstop, F3, lands');
    expect(profileNote('clear', TIGHT_CONFIG)).toBe('Clear: every flight runs to time.');
    expect(profileNote('balanced', TIGHT_CONFIG)).toBe('Mixed: each flight is cancelled 1 time in 10 and delayed or diverted 1 time in 10.');
    expect(screen.getByText(profileNote('balanced', TIGHT_CONFIG))).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Stress/ }));
    expect(screen.getByText(profileNote('storm', TIGHT_CONFIG))).toBeTruthy();
  });

  // re-review: the return route changed only the labels, which looked broken
  it('says the return route mirrors the outbound one, and its numbers match', () => {
    renderDemo();
    const before = screen.getByText(gridHeadline(initialWorlds)).textContent;
    expect(screen.queryByText(/mirrors the outbound one/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'JFK to SFO' }));
    expect(screen.getByText(/The return network mirrors the outbound one, flight for flight, so every number matches\./)).toBeTruthy();
    expect(screen.getByText(/^Deadline lookahead is on time/).textContent).toBe(before);
  });

  it('replays the world a square stands for, under that panel’s policy, and brings the replay into view', () => {
    renderDemo();
    revealResult.mockClear();
    fireEvent.click(within(panel(/^Nonstop first/)).getByRole('button', { name: /World 1, seed 42: late/ }));
    expect(status()).toBe('Arrived late');
    expect(screen.getByRole('combobox', { name: 'Policy' })).toHaveProperty('value', 'nonstop');
    expect(screen.getByText(/Seed 42 · Nonstop first/)).toBeTruthy();
    expect(revealResult).toHaveBeenCalledOnce();
    expect(revealResult.mock.calls[0][0]).toBe(screen.getByRole('region', { name: /^Replay/ }));
  });

  it('scores the trip in its reward terms, and says what the reward pays for', () => {
    renderDemo();
    const score = screen.getByRole('group', { name: 'Reward' });
    for (const term of ['On time', 'Arrived', 'Earliness']) expect(within(score).getByText(term)).toBeTruthy();
    expect(screen.getByText('Attempts')).toBeTruthy();
    expect(screen.getByText(/of 4 allowed/)).toBeTruthy();
    expect(
      screen.getByText(
        'The reward is paid when the trip ends: 0.80 for landing by the 07:55 deadline, 0.10 for landing at all, and up to 0.10 more the earlier the landing before the horizon, 16:00, when the simulated day ends.',
      ),
    ).toBeTruthy();
  });

  // by label and text, not role: a role query computes the name of every one
  // of the grid's 256 squares, which ran this test past its timeout under load
  it('rewinds a decision, takes another flight and lets the policy finish', () => {
    renderDemo();
    fireEvent.click(screen.getByLabelText('Restart this world'));
    expect(status()).toBe('In progress');
    fireEvent.click(screen.getByLabelText('Choose F1 to ORD'));
    fireEvent.click(screen.getByText('Take F1'));
    expect(status()).toBe('No onward flight');
    fireEvent.click(screen.getByLabelText('Rewind one decision'));
    expect(status()).toBe('In progress');
    fireEvent.click(screen.getByText('Let the policy finish'));
    expect(status()).toBe('Arrived on time');
  });

  it('recomputes every panel and the headline when the deadline moves', () => {
    renderDemo();
    fireEvent.click(screen.getByRole('radio', { name: /09:00/ }));
    expect(panel(/^Nonstop first: 55 of 64/)).toBeTruthy();
    expect(panel(/^Deadline lookahead: 55 of 64/)).toBeTruthy();
    expect(screen.getByText('Here Deadline lookahead and Nonstop first come out the same: both on time in 55 of 64 worlds.')).toBeTruthy();
  });

  it('keeps settings and export under the hood, and refuses settings that break the scenario', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderDemo();
    const hood = screen.getByText(/^Under the hood/).closest('details')!;
    expect(hood.open).toBe(false);
    openUnderTheHood();
    // a minutes field reads back as a clock
    expect(within(hood).getByText('= 07:55')).toBeTruthy();
    fireEvent.change(within(hood).getByLabelText(/^Deadline/), { target: { value: '1000' } });
    fireEvent.click(screen.getByText('Apply to all worlds'));
    expect(screen.getByRole('alert').textContent).toContain('Deadline must not exceed');
    expect(panel(/^Deadline lookahead: 40 of 64/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Flight attempts'), { target: { value: 'two' } });
    fireEvent.click(screen.getByText('Apply to all worlds'));
    expect(screen.getByRole('alert').textContent).toBe('Flight attempts should be a whole number.');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('moves through a panel with the arrow keys', () => {
    renderDemo();
    const grid = panel(/^Deadline lookahead/);
    const first = within(grid).getByRole('button', { name: /World 1,/ });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^World 9,/);
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^World 64,/);
  });

  // live QA: settings errors named internal fields ("maxAttempts: Number must be…"),
  // the seed range was unstated, and a top seed would push the 64th world past it
  it('refuses settings in the form’s own words and states every limit', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderDemo();
    openUnderTheHood();
    expect(screen.getByText(/First world seed 0–2,147,483,584/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Flight attempts'), { target: { value: '9' } });
    fireEvent.click(screen.getByText('Apply to all worlds'));
    expect(screen.getByRole('alert').textContent).toBe('Flight attempts should be at most 6.');
    fireEvent.change(screen.getByLabelText('Flight attempts'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('First world seed'), { target: { value: '2147483647' } });
    fireEvent.click(screen.getByText('Apply to all worlds'));
    expect(screen.getByRole('alert').textContent).toBe('First world seed should be at most 2,147,483,584, so all 64 worlds’ seeds stay in range.');
    expect(panel(/^Deadline lookahead: 40 of 64/)).toBeTruthy();
    vi.restoreAllMocks();
  });

  // live QA: Enter on a square scrolled the replay into view and left focus on the square, off screen
  it('moves keyboard focus to the replay a square opens; a pointer click leaves focus alone', () => {
    renderDemo();
    const square = within(panel(/^Nonstop first/)).getByRole('button', { name: /World 2,/ });
    square.focus();
    fireEvent.click(square, { detail: 0 });
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: /^World 2/ }));
    const pointed = within(panel(/^Nonstop first/)).getByRole('button', { name: /World 3,/ });
    pointed.focus();
    fireEvent.click(pointed, { detail: 1 });
    expect(document.activeElement).toBe(pointed);
  });

  // live QA: only the flight's name selected a bookable row
  it('selects a bookable flight from anywhere on its row', () => {
    renderDemo();
    fireEvent.click(screen.getByLabelText('Restart this world'));
    const region = screen.getByRole('region', { name: 'Bookable flights' });
    const f3 = within(region).getByLabelText('Choose F3 to JFK').closest('tr')!;
    fireEvent.click(within(f3).getAllByRole('cell')[2]);
    expect(screen.getByText('Take F3')).toBeTruthy();
  });

  // live QA: the policy menu ran in a different order from the panels
  it('lists the policies in the panels’ order', () => {
    renderDemo();
    const options = [...(screen.getByRole('combobox', { name: 'Policy' }) as HTMLSelectElement).options].map((o) => o.textContent);
    expect(options).toEqual(['Nonstop first', 'Deadline lookahead', 'Greedy next arrival', 'Seeded random']);
  });

  // live QA: unapplied settings vanished without a word when a control above changed the scenario
  it('keeps an unapplied setting when the scenario changes, and says it is not applied', () => {
    renderDemo();
    openUnderTheHood();
    fireEvent.change(screen.getByLabelText('Connection buffer (minutes)'), { target: { value: '45' } });
    expect(screen.getByText(/Not applied yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Stress/ }));
    expect((screen.getByLabelText('Connection buffer (minutes)') as HTMLInputElement).value).toBe('45');
    expect(screen.getByText(/Not applied yet/)).toBeTruthy();
  });

  // live QA: dashed "bookable" lines stayed on every unflown route after the trip ended
  it('dashes only the flights bookable now, and keys them only while some are', () => {
    renderDemo();
    const key = () => screen.getByRole('img', { name: /^Route network/ }).closest('figure')!.querySelector('figcaption')!.textContent;
    expect(key()).not.toMatch(/Bookable/);
    fireEvent.click(screen.getByLabelText('Restart this world'));
    expect(key()).toMatch(/Bookable/);
  });

  it('says why nothing is bookable, instead of an empty table', () => {
    renderDemo();
    openUnderTheHood();
    // the last flight out of SFO leaves at minute 300
    fireEvent.change(screen.getByLabelText('Connection buffer (minutes)'), { target: { value: '301' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to all worlds' }));
    fireEvent.click(screen.getByLabelText('Restart this world'));
    expect(screen.queryByRole('region', { name: 'Bookable flights' })).toBeNull();
    expect(screen.getByText(/^No flight can be booked from SFO/)).toBeTruthy();
  });

  it('exports the trip with the policy, any choice of yours, and the screen’s labels', async () => {
    let blob: Blob | undefined;
    vi.stubGlobal('URL', { createObjectURL: (b: Blob) => ((blob = b), 'blob:trace'), revokeObjectURL: vi.fn() });
    let name = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      name = this.download;
    });
    renderDemo();
    fireEvent.click(screen.getByLabelText('Restart this world'));
    fireEvent.click(screen.getByLabelText('Choose F1 to ORD'));
    fireEvent.click(screen.getByText('Take F1'));
    openUnderTheHood();
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON trace' }));
    expect(name).toBe('flight-routing-sfo-to-jfk-mixed-seed-42-deadline-lookahead-with-your-choices.json');
    // jsdom's Blob has no text(); its FileReader reads one
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob!);
    });
    const trace = JSON.parse(text);
    expect(trace.replay).toEqual({
      policy: 'Deadline lookahead',
      labels: { route: 'SFO to JFK', disruptions: 'Mixed', deadline: '07:55' },
      decisions: [{ flight: 'F1', by: 'your choice' }],
    });
    // the notice is about that export, and goes with the next change
    expect(screen.getByRole('status', { name: 'Export' }).textContent).toBe('Trace exported.');
    fireEvent.click(screen.getByLabelText('Rewind one decision'));
    expect(screen.getByRole('status', { name: 'Export' }).textContent).toBe('');
  });

  it('exports the trip as versioned JSON', () => {
    const create = vi.fn(() => 'blob:trace');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderDemo();
    openUnderTheHood();
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON trace' }));
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledOnce();
    expect(screen.getByRole('status', { name: 'Export' }).textContent).toBe('Trace exported.');
  });
});
