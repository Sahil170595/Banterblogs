import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, evaluate, generateCohort, estimate, exportEvaluation, type Episode } from './engine';

const balanced: Episode[] = [0, 1, 2].map(action => ({
  id: `e${action}`,
  steps: [{ context: 1, action, behavior: [1 / 3, 1 / 3, 1 / 3], gain: action, harm: 0 }],
}));
const config = { ...DEFAULT_CONFIG, intensity: 0.6, responsiveness: 0, anchor: 0, gainWeight: 1, harmWeight: 0, gamma: 1, cap: 10 };

describe('offline evaluation', () => {
  it('recovers the analytical one-step stochastic value with complete action coverage', () => {
    const result = estimate(balanced, config);
    // pi = [.4, .21, .39], reward = [0, 1, 2].
    expect(result.pdis).toBeCloseTo(0.99);
    expect(result.normalized).toBeCloseTo(0.99);
    expect(result.logged).toBeCloseTo(1);
  });
  it('logging policy identity recovers the factual average and full ESS', () => {
    const result = estimate(balanced, { ...config, anchor: 1 });
    expect(result.pdis).toBeCloseTo(1);
    expect(result.normalized).toBeCloseTo(1);
    expect(result.horizons[0].rawEss).toBeCloseTo(3);
  });
  it('recovers the complete analytical two-step distribution with cumulative ratios', () => {
    const full: Episode[] = balanced.flatMap((left, i) => balanced.map((right, j) => ({ id: `${i}-${j}`, steps: [...left.steps, ...right.steps] })));
    const result = estimate(full, config);
    expect(result.pdis).toBeCloseTo(1.98);
    expect(result.normalized).toBeCloseTo(1.98);
  });
  it('clips cumulative ratios, not step ratios, and keeps normalized values bounded', () => {
    const episodes: Episode[] = [{ id: 'rare', steps: [0, 1].map(() => ({ context: 1, action: 2, behavior: [0.8, 0.1, 0.1], gain: 1, harm: 0 })) }];
    const result = estimate(episodes, { ...config, intensity: 1, cap: 2 });
    expect(result.pdis).toBeCloseTo(6.5 + 42.25);
    expect(result.clipped).toBeCloseTo(4);
    expect(result.normalized).toBeCloseTo(2);
    expect(result.horizons[1].maxRawWeight).toBeCloseTo(42.25);
  });
  it('does not identify target values across a structural support gap', () => {
    const gap: Episode[] = [{ id: 'gap', steps: [{ context: 0, action: 0, behavior: [1, 0, 0], gain: 1, harm: 0 }] }];
    const result = estimate(gap, config);
    expect(result.unsupportedMass).toBeCloseTo(0.6);
    expect(result.pdis).toBeNull();
    expect(result.clipped).toBeNull();
    expect(result.normalized).toBeNull();
    expect(result.logged).toBe(1);
  });
  it('returns no normalized estimate when all target trajectory weights vanish', () => {
    const zero = estimate([{ id: 'z', steps: [{ context: 1, action: 0, behavior: [0.5, 0.25, 0.25], gain: 1, harm: 0 }] }], { ...config, intensity: 1 });
    expect(zero.pdis).toBe(0);
    expect(zero.normalized).toBeNull();
  });
  it('ignores zero denominators at horizons with zero discount', () => {
    const episode: Episode = { id: 'discount-zero', steps: [0, 1].map(action => ({ context: 1, action, behavior: [0.5, 0.25, 0.25], gain: 1, harm: 0 })) };
    expect(estimate([episode], { ...config, intensity: 0, gamma: 0 }).normalized).toBe(1);
    const futureGap: Episode = { id: 'future-gap', steps: [balanced[0].steps[0], { ...balanced[0].steps[0], behavior: [1, 0, 0] }] };
    const result = estimate([futureGap], { ...config, gamma: 0 });
    expect(result.unsupportedMass).toBe(0);
    expect(result.normalized).toBe(0);
  });
  it('reward ablation and penalties change the actual reward, not the cohort', () => {
    const harm = balanced.map(e => ({ ...e, steps: e.steps.map(s => ({ ...s, harm: s.action === 2 ? 1 : 0 })) }));
    expect(estimate(harm, { ...config, gainWeight: 0, harmWeight: 2 }).pdis).toBeCloseTo(-0.78);
    expect(estimate(harm, { ...config, cap: 0.5 }).clipped).not.toBe(estimate(harm, config).clipped);
  });
  it('replays cohort and paired bootstrap exactly, with versioned export', () => {
    expect(generateCohort(DEFAULT_CONFIG)).toEqual(generateCohort(DEFAULT_CONFIG));
    const a = evaluate(DEFAULT_CONFIG);
    expect(a).toEqual(evaluate(DEFAULT_CONFIG));
    const exported = JSON.parse(exportEvaluation(a));
    expect(exported.schema).toBe('offline-policy-evaluation/v1');
    expect(exported.cohort.length).toBe(DEFAULT_CONFIG.size);
    expect(exported.config).toEqual(DEFAULT_CONFIG);
    expect(generateCohort({ ...DEFAULT_CONFIG, seed: 2 })).not.toEqual(a.cohort);
    expect(a.comparisons[0].intervals.normalized).not.toBeNull();
    expect(a.comparisons[2].differences.pdis).toEqual([0, 0]);
    expect(generateCohort({ ...DEFAULT_CONFIG, gainWeight: 0, intensity: 1, anchor: 0 })).toEqual(a.cohort);
  });
  it('withholds intervals rather than dropping bootstrap draws with zero denominators', () => {
    const results = Array.from({ length: 20 }, (_, seed) => evaluate({ ...DEFAULT_CONFIG, size: 8, seed, anchor: 0, intensity: 1, responsiveness: 0, scenario: 'balanced' }));
    const fragile = results.find(r => r.comparisons[0].result.normalized !== null && r.comparisons[0].unavailableDraws.normalized > 0);
    expect(fragile).toBeDefined();
    expect(fragile?.comparisons[0].intervals.normalized).toBeNull();
  });
  it.each([{ cap: 0 }, { seed: NaN }, { size: 10000 }, { gamma: 1.1 }, { gainWeight: -1 }, { anchor: 2 }, { scenario: 'unknown' }])('rejects invalid controls %j', patch => {
    expect(() => evaluate({ ...DEFAULT_CONFIG, ...patch })).toThrow();
  });
  it('rejects empty, malformed, inconsistent and impossible logs', () => {
    expect(() => estimate([], config)).toThrow();
    expect(() => estimate([{ id: 'x', steps: [{ ...balanced[0].steps[0], gain: Infinity }] }], config)).toThrow();
    expect(() => estimate([{ id: 'x', steps: [{ ...balanced[0].steps[0], behavior: [0, 0.5, 0.5] }] }], config)).toThrow();
    expect(() => estimate([balanced[0], { ...balanced[0] }], config)).toThrow();
    expect(() => estimate([{ ...balanced[0], steps: [] }], config)).toThrow();
    expect(() => estimate([{ ...balanced[0], steps: [balanced[0].steps[0], balanced[0].steps[0]] }, balanced[1]], config)).toThrow();
    expect(() => estimate([{ ...balanced[0], steps: [{ ...balanced[0].steps[0], behavior: [0.5, 0.5, 0.5] }] }], config)).toThrow();
  });
  it('handles very large finite importance weights without silent NaN diagnostics', () => {
    const extreme: Episode[] = [{ id: 'extreme', steps: [{ context: 1, action: 2, behavior: [1, 0, 1e-200], gain: 1, harm: 0 }] }];
    const result = estimate(extreme, config);
    expect(result.horizons[0].rawEss).toBe(1);
    expect(result.horizons[0].maxShare).toBe(1);
    expect(result.pdis).toBeNull(); // Unsupported Adjust action still blocks identification.
  });
});
