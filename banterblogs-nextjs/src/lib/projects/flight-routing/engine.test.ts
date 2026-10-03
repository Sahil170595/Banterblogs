import { describe, expect, it } from 'vitest';
import { bestAction, candidates, comparePolicies, createEpisode, DEFAULT_CONFIG, exportTrace, mask, runPolicy, sampleOutcome, step, validateConfig } from './engine';
import { getScenario, outcomePool } from './fixtures';

describe('flight routing transition contract', () => {
  it('enumerates canonical candidates with a fixed padded action mask', () => {
    const state = createEpisode(DEFAULT_CONFIG);
    expect(candidates(state).map(f => f.id)).toEqual(['F1', 'F2', 'F3', 'F4']);
    expect(mask(state)).toEqual([1, 1, 1, 1, 0, 0, 0, 0]);
    expect(candidates(createEpisode({ ...DEFAULT_CONFIG, buffer: 91 })).map(f => f.id)).toEqual(['F3', 'F4']);
  });
  it('matches fixed reference on-time and late reward arithmetic', () => {
    const initial = createEpisode(DEFAULT_CONFIG);
    const ontime = step(initial, 2, 2);
    expect(ontime.reason).toBe('arrived');
    expect(ontime.clock).toBe(480);
    expect(ontime.reward.total).toBeCloseTo(0.95);
    expect(ontime.reward).toMatchObject({ deadline: 0.8, arrival: 0.1, earliness: 0.05 });
    const late = step(initial, 2, 1);
    expect(late.clock).toBe(660);
    expect(late.reason).toBe('arrived');
    expect(late.reward.total).toBeCloseTo(0.13125);
  });
  it('preserves cancellation priority and unresolved diversion terminal state', () => {
    const initial = createEpisode(DEFAULT_CONFIG);
    const cancelled = step(initial, 2, 0);
    expect(cancelled).toMatchObject({ reason: 'cancelled', airport: 'SFO', clock: 150 });
    expect(cancelled.legs[0].arrival).toBeNull();
    expect(cancelled.reward.total).toBe(0);
    const diverted = step(initial, 3, 1);
    expect(diverted).toMatchObject({ reason: 'unresolved_diversion', airport: 'SFO', clock: 650 });
    expect(diverted.legs[0].resolvedAirport).toBe('DEN');
  });
  it('uses actual landing time for onward availability, not scheduled arrival', () => {
    const landed = step(createEpisode(DEFAULT_CONFIG), 1, 1);
    expect(landed.clock).toBe(380);
    expect(candidates(landed).map(f => f.id)).toEqual(['F6']);
  });
  it('distinguishes empty masks, invalid padded actions, attempts and horizon', () => {
    expect(step(createEpisode(DEFAULT_CONFIG), 7).reason).toBe('invalid_action');
    expect(step(createEpisode({ ...DEFAULT_CONFIG, buffer: 600 }), 0).reason).toBe('no_candidates');
    expect(step(createEpisode({ ...DEFAULT_CONFIG, maxAttempts: 1 }), 1, 2).reason).toBe('max_attempts');
    expect(step(createEpisode({ ...DEFAULT_CONFIG, horizon: 500, deadline: 490 }), 2, 1).reason).toBe('horizon');
    expect(() => step(createEpisode(DEFAULT_CONFIG), -1)).toThrow(/action/i);
    expect(() => step(step(createEpisode(DEFAULT_CONFIG), 2, 2), 0)).toThrow(/terminated/i);
  });
  // live QA found lookahead taking the first listed flight when every value tied;
  // Gatebound's DeadlinePlannerPolicy.act breaks ties by earliest scheduled
  // arrival, then lowest index (planning.py, max key (value, -arrival, -index))
  it('breaks a lookahead tie as Gatebound does: earliest scheduled arrival, then lowest index', () => {
    const flight = (id: string, arrive: number) => ({ ...getScenario('west-east').flights[0], id, arrive });
    expect(bestAction([0, 0, 0], [flight('A', 600), flight('B', 500), flight('C', 500)])).toBe(1);
    expect(bestAction([0.2, 0.5, 0.5], [flight('A', 300), flight('B', 700), flight('C', 650)])).toBe(2);
    expect(bestAction([0.9, 0.5], [flight('A', 900), flight('B', 100)])).toBe(0);
  });
  it('fails greedily at a dead end even when a valid direct route exists', () => {
    expect(runPolicy(DEFAULT_CONFIG, 'greedy').reason).toBe('no_candidates');
    expect(runPolicy({ ...DEFAULT_CONFIG, profile: 'clear' }, 'nonstop').reason).toBe('arrived');
  });
  it('replays and exports complete versioned deterministic configuration', () => {
    const first = runPolicy(DEFAULT_CONFIG, 'deadline');
    expect(runPolicy(DEFAULT_CONFIG, 'deadline')).toEqual(first);
    expect(createEpisode(DEFAULT_CONFIG).legs).toEqual([]);
    expect(JSON.parse(exportTrace(first))).toMatchObject({ version: 'flight-routing.trace.v1', fixtureVersion: 'synthetic-network-v1', config: DEFAULT_CONFIG, episode: first });
    expect(mask(first)).toEqual(Array(8).fill(0));
  });
  it('compares the same seed range and retains all terminal records', () => {
    const comparison = comparePolicies(DEFAULT_CONFIG, 16);
    expect(comparison).toEqual(comparePolicies(DEFAULT_CONFIG, 16));
    expect(comparison.rows).toHaveLength(4);
    for (const row of comparison.rows) expect(Object.values(row.reasons).reduce((a,b) => a+b, 0)).toBe(16);
    expect(comparison.rows.find(r => r.policy === 'greedy')?.arrived).toBe(0);
  });
  it('selects complete joint donors independently of action order', () => {
    const flight = getScenario('west-east').flights[2];
    const donor = sampleOutcome(flight, DEFAULT_CONFIG);
    expect(outcomePool(flight, 'balanced')).toContainEqual(donor);
    expect(sampleOutcome(flight, DEFAULT_CONFIG)).toEqual(donor);
  });
  it('validates untrusted input without accepting private or unknown fields', () => {
    expect(() => validateConfig(null)).toThrow(/Scenario/);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, seed: '42' })).toThrow(/seed/);
    expect(() => validateConfig({ ...DEFAULT_CONFIG, privateMetadata: 'not exported' })).toThrow(/Unrecognized/);
    expect(() => step(createEpisode(DEFAULT_CONFIG), 2, 10)).toThrow(/Donor/);
    expect(() => comparePolicies(DEFAULT_CONFIG, 257)).toThrow(/1-256/);
    expect(() => runPolicy(DEFAULT_CONFIG, 'unknown' as never)).toThrow(/policy/);
  });
  it('includes boundary departure, deadline and horizon arrivals', () => {
    expect(candidates(createEpisode({ ...DEFAULT_CONFIG, buffer: 150 })).map(f => f.id)).toContain('F3');
    const atHorizon = step(createEpisode({ ...DEFAULT_CONFIG, deadline: 480, horizon: 480 }), 2, 2);
    expect(atHorizon.reason).toBe('arrived');
    expect(atHorizon.reward.total).toBeCloseTo(.9);
    const atDeadline = step(createEpisode({ ...DEFAULT_CONFIG, deadline: 480 }), 2, 2);
    expect(atDeadline.reward.deadline).toBe(.8);
  });
  it('validates both public schedule catalogs and every donor bank', () => {
    for (const scenario of ['west-east', 'east-west'] as const) {
      const network = getScenario(scenario);
      expect(new Set(network.flights.map(f => f.id)).size).toBe(network.flights.length);
      for (const flight of network.flights) {
        expect(Number.isSafeInteger(flight.depart)).toBe(true);
        expect(flight.arrive).toBeGreaterThan(flight.depart);
        expect(flight.origin).not.toBe(flight.dest);
        for (const profile of ['clear', 'balanced', 'storm'] as const) {
          const pool = outcomePool(flight, profile);
          expect(pool).toHaveLength(10);
          expect(new Set(pool.map(o => o.id)).size).toBe(pool.length);
          for (const outcome of pool) {
            expect(typeof outcome.cancelled).toBe('boolean');
            if (!outcome.cancelled) {
              expect(Number.isSafeInteger(outcome.depDelay)).toBe(true);
              expect(Number.isSafeInteger(outcome.diverted ? outcome.divDelay : outcome.arrDelay)).toBe(true);
              expect(flight.arrive + (outcome.diverted ? outcome.divDelay! : outcome.arrDelay!)).toBeGreaterThan(flight.depart + outcome.depDelay!);
            }
          }
        }
      }
    }
  });
  it.each([{seed: NaN}, {seed: 1.1}, {deadline: 1000}, {buffer: -1}, {maxAttempts: 0}, {scenario: 'unknown'}, {profile: 'unknown'}, {horizon: Infinity}])('rejects malformed config %j', change => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, ...change })).toThrow();
  });
});
