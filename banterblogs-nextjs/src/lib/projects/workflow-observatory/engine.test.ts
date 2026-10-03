import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, initialSite, transition, observeModel, completion, planFor, startTrace, runWorkflow, replayExport, roleDistance, type Config, type Event, type FixturePort } from './engine';

function fixture(config: Config): { port: FixturePort; events: Event[] } {
  let state = initialSite();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const events: Event[] = [];
  const send = (event: Event) => { state = transition(state, event, config); events.push(event); };
  return { events, port: {
    read: () => observeModel(state),
    click: name => {
      const actualName = config.failure === 'label-drift' ? 'New reservation' : 'Reserve slot';
      if (name !== actualName) return false;
      send({ type: 'open' }); return true;
    },
    fill: value => send({ type: 'fill', value }),
    select: value => send({ type: 'select', value }),
    submit: () => { send({ type: 'submit' }); timer = setTimeout(() => send({ type: 'settle' }), config.latencyMs); },
    cancelPending: () => { clearTimeout(timer); if (state.phase === 'saving') send({ type: 'cancel' }); },
  } };
}

afterEach(() => vi.useRealTimers());
describe('actual workflow state and condition gates', () => {
  it('requires a committed matching record, not just form validity or a success toast', () => {
    let state = transition(initialSite(), { type: 'open' }, DEFAULT_CONFIG);
    state = transition(state, { type: 'fill', value: DEFAULT_CONFIG.title }, DEFAULT_CONFIG);
    expect(observeModel(state).formValid).toBe(true);
    expect(completion(observeModel(state), DEFAULT_CONFIG).complete).toBe(false);
    state = transition(state, { type: 'submit' }, DEFAULT_CONFIG);
    expect(state.phase).toBe('saving');
    expect(completion(observeModel(state), DEFAULT_CONFIG).complete).toBe(false);
    state = transition(state, { type: 'settle' }, { ...DEFAULT_CONFIG, failure: 'false-toast' });
    expect(state.toast).toBe('success');
    expect(state.record).toBeNull();
    expect(completion(observeModel(state), DEFAULT_CONFIG).complete).toBe(false);
  });
  it.each(['none', 'label-drift'] as const)('executes a successful %s workflow with known-label fallback', async failure => {
    vi.useFakeTimers();
    const config = { ...DEFAULT_CONFIG, failure, selectorPolicy: 'fallback' as const };
    const { port } = fixture(config);
    const promise = runWorkflow(startTrace(config), port);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.status).toBe('complete');
    expect(result.entries).toHaveLength(planFor(config).length);
    expect(result.entries.at(-1)?.after.recordTitle).toBe(config.title);
    expect(result.conditions.every(condition => condition.met)).toBe(true);
  });
  it.each(['reject-save', 'false-toast', 'label-drift'] as const)('rejects %s rather than replaying success', async failure => {
    vi.useFakeTimers();
    const config = { ...DEFAULT_CONFIG, failure, selectorPolicy: 'strict' as const };
    const promise = runWorkflow(startTrace(config), fixture(config).port);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.status).toBe('failed');
    expect(result.conditions.some(condition => !condition.met)).toBe(true);
    expect(result.entries.at(-1)?.status).toBe('failed');
  });
  it('fails a fixed delay and succeeds a condition wait on the same slow UI', async () => {
    vi.useFakeTimers();
    for (const waitPolicy of ['fixed', 'condition'] as const) {
      const config = { ...DEFAULT_CONFIG, latencyMs: 700, waitPolicy };
      const promise = runWorkflow(startTrace(config), fixture(config).port);
      await vi.runAllTimersAsync();
      expect((await promise).status).toBe(waitPolicy === 'fixed' ? 'failed' : 'complete');
    }
  });
  it('bounds polling, cancels a pending save and does not allow late completion', async () => {
    vi.useFakeTimers();
    const config = { ...DEFAULT_CONFIG, timeoutMs: 100, latencyMs: 1500 };
    const { port } = fixture(config);
    const promise = runWorkflow(startTrace(config), port);
    await vi.runAllTimersAsync();
    expect((await promise).status).toBe('failed');
    expect(port.read().phase).toBe('cancelled');
    expect(port.read().recordId).toBeNull();
  });
  it('stops at the actual action budget', async () => {
    vi.useFakeTimers();
    const config = { ...DEFAULT_CONFIG, budget: 2 };
    const promise = runWorkflow(startTrace(config), fixture(config).port);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.status).toBe('budget-exhausted');
    expect(result.entries).toHaveLength(2);
    expect(result.entries.at(-1)?.after.recordId).toBeNull();
  });
  it('recognizes an already observed goal instead of requiring every planned action', async () => {
    vi.useFakeTimers();
    const config = { ...DEFAULT_CONFIG, budget: 1 };
    const { port } = fixture(config);
    port.click('Reserve slot'); port.fill(config.title); port.select(config.room); port.submit();
    await vi.runAllTimersAsync();
    expect(completion(port.read(), config).complete).toBe(true);
    const promise = runWorkflow(startTrace(config), port);
    await vi.runAllTimersAsync();
    const trace = await promise;
    expect(trace.status).toBe('complete');
    expect(trace.entries).toHaveLength(0);
  });
  it('cancels asynchronous execution rather than allowing its pending timer to complete', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const { port } = fixture(DEFAULT_CONFIG);
    const promise = runWorkflow(startTrace(), port, controller.signal);
    await vi.advanceTimersByTimeAsync(60);
    expect(port.read().phase).toBe('saving');
    controller.abort();
    await vi.runAllTimersAsync();
    expect((await promise).status).toBe('cancelled');
    expect(port.read().recordId).toBeNull();
  });
  it('rejects incomplete title input before submitting', async () => {
    vi.useFakeTimers();
    const config = { ...DEFAULT_CONFIG, title: ' ' };
    const promise = runWorkflow(startTrace(config), fixture(config).port);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.status).toBe('failed');
    expect(result.entries.at(-1)?.reason).toContain('three');
  });
  it('recomputes valid event replay and ignores forged saved verdicts', async () => {
    vi.useFakeTimers();
    const { port, events } = fixture(DEFAULT_CONFIG);
    const promise = runWorkflow(startTrace(DEFAULT_CONFIG), port);
    await vi.runAllTimersAsync();
    await promise;
    const envelope = { schemaVersion: 1, fixtureVersion: 'reservation-v1', config: DEFAULT_CONFIG, events, trace: { status: 'failed' } };
    const replay = replayExport(JSON.parse(JSON.stringify(envelope)));
    expect(replay.completion.complete).toBe(true);
    expect(replay.frames.at(-1)?.record?.title).toBe(DEFAULT_CONFIG.title);
    expect(replayExport({ ...envelope, config: { ...DEFAULT_CONFIG, failure: 'false-toast' } }).completion.complete).toBe(false);
    expect(() => replayExport({ ...envelope, events: [{ type: 'settle' }] })).toThrow();
    expect(() => replayExport({ ...envelope, schemaVersion: 999 })).toThrow();
  });
  it.each([{ title: 'x'.repeat(61) }, { latencyMs: NaN }, { budget: 0 }, { timeoutMs: -1 }, { failure: 'external' }, { url: 'https://outside.invalid' }])('rejects invalid configuration %j', change => {
    expect(() => startTrace({ ...DEFAULT_CONFIG, ...change })).toThrow();
  });
  it('enforces legal state ordering, fresh reset and evidence distance invariants', () => {
    expect(() => transition(initialSite(), { type: 'submit' }, DEFAULT_CONFIG)).toThrow();
    expect(() => transition(initialSite(), { type: 'settle' }, DEFAULT_CONFIG)).toThrow();
    expect(initialSite().record).toBeNull();
    expect(roleDistance([], [])).toBe(0);
    expect(roleDistance(['button:Reserve slot'], ['dialog:Reservation'])).toBe(1);
    expect(roleDistance(['a', 'b'], ['a', 'b'])).toBe(0);
    expect(planFor(DEFAULT_CONFIG).map(step => step.kind)).toEqual(['open', 'fill', 'select', 'submit', 'wait']);
  });
});
