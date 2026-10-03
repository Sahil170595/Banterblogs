import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialSite, observeModel, runWorkflow, startTrace, transition, type Config, type Event, type FixturePort } from './engine';
import { judge, parallaxAccepts, SCENARIOS, settle } from './scenarios';

// The page's table: what a success notice, the completion gate and the
// committed record each say about the same attempts. Each scenario's events
// must be what the executor itself does with that configuration.

function modelPort(config: Config) {
  let state = initialSite();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const send = (event: Event) => {
    state = transition(state, event, config);
  };
  const port: FixturePort = {
    read: () => observeModel(state),
    click: (name) => {
      if (name !== (config.failure === 'label-drift' ? 'New reservation' : 'Reserve slot')) return false;
      send({ type: 'open' });
      return true;
    },
    fill: (value) => send({ type: 'fill', value }),
    select: (value) => send({ type: 'select', value }),
    submit: () => {
      send({ type: 'submit' });
      timer = setTimeout(() => send({ type: 'settle' }), config.latencyMs);
    },
    cancelPending: () => {
      clearTimeout(timer);
      if (state.phase === 'saving') send({ type: 'cancel' });
    },
  };
  return { port, final: () => state };
}

afterEach(() => vi.useRealTimers());

describe('evidence scenarios', () => {
  it('match what the executor does with each configuration', async () => {
    for (const scenario of SCENARIOS.filter((s) => s.executor)) {
      vi.useFakeTimers();
      const { port, final } = modelPort(scenario.config);
      const run = runWorkflow(startTrace(scenario.config), port);
      await vi.runAllTimersAsync();
      await run;
      expect(final(), scenario.id).toEqual(settle(scenario));
      vi.useRealTimers();
    }
  });

  it('show a success notice claiming three attempts that only one completed', () => {
    const verdicts = SCENARIOS.map((s) => ({ id: s.id, ...judge(s) }));
    expect(verdicts.filter((v) => v.notice).map((v) => v.id)).toEqual(['normal', 'no-record', 'wrong-room']);
    expect(verdicts.filter((v) => v.gate).map((v) => v.id)).toEqual(['normal']);
    // the completion gate agrees with the committed record every time
    for (const v of verdicts) expect(v.gate, v.id).toBe(v.record);
  });

  it("accept every attempt that typed a title under Parallax's interactive check", () => {
    const verdicts = SCENARIOS.map((s) => ({ id: s.id, ...judge(s) }));
    expect(verdicts.filter((v) => v.parallax).map((v) => v.id)).toEqual(['normal', 'no-record', 'wrong-room', 'rejected', 'checked-early']);
  });

  it("read Parallax's check only after the steps it treats as interactive", () => {
    const base = SCENARIOS[0];
    const opened: Event[] = [{ type: 'open' }];
    const tooShort: Event[] = [{ type: 'open' }, { type: 'fill', value: 'ab' }];
    expect(parallaxAccepts({ ...base, events: opened })).toBe(false);
    expect(parallaxAccepts({ ...base, events: tooShort })).toBe(false);
    expect(parallaxAccepts({ ...base, events: [...tooShort, { type: 'fill', value: 'abc' }] })).toBe(true);
  });

  it('keeps a committed record when the dialog opens again', () => {
    const saved = settle(SCENARIOS.find((s) => s.id === 'normal')!);
    const reopened = transition(saved, { type: 'open' }, SCENARIOS[0].config);
    expect(reopened.record).toEqual(saved.record);
    expect(reopened.dialogOpen).toBe(true);
  });
});
