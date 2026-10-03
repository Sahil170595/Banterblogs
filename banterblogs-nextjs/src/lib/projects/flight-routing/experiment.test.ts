import { describe, expect, it } from 'vitest';
import { actionValues, createEpisode, DEFAULT_CONFIG, step } from './engine';
import { fixtureExperiment } from './experiment';
import cases from './reference-cases.json';
import recorded from './experiment.json';

describe('fixed reference transitions and synthetic experiment', () => {
  it.each(cases)('matches $name', testCase => {
    let state = createEpisode({ ...DEFAULT_CONFIG, ...testCase.config });
    for (const [action, donor] of testCase.steps) state = step(state, action, donor);
    expect(state.reason).toBe(testCase.expected.reason);
    expect(state.airport).toBe(testCase.expected.airport);
    expect(state.clock).toBe(testCase.expected.clock);
    expect(state.reward.total).toBeCloseTo(testCase.expected.reward, 12);
  });
  it('derives model chances from complete paths, not a greedy next-leg time', () => {
    const normal = actionValues(createEpisode(DEFAULT_CONFIG));
    expect(normal[0]).toBe(0);
    expect(normal[1]).toBeCloseTo(.64);
    expect(normal[2]).toBeCloseTo(.8);
    const tight = actionValues(createEpisode({ ...DEFAULT_CONFIG, deadline: 475 }));
    expect(tight[1]).toBeCloseTo(.64);
    expect(tight[2]).toBe(0);
  });
  it('reproduces the complete seed-range experiment', () => {
    const report = fixtureExperiment();
    expect(report).toEqual(fixtureExperiment());
    expect(report.normal.rows.find(r => r.policy === 'greedy')?.arrived).toBe(0);
    expect(report.tight.rows.find(r => r.policy === 'nonstop')?.onTime).toBe(0);
    expect(report.tight.rows.find(r => r.policy === 'deadline')!.onTime).toBeGreaterThan(0);
    expect(report).toEqual(recorded);
  });
});
