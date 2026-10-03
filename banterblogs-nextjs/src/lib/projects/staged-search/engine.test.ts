import { describe, expect, it } from 'vitest';
import { PipelineError, roundHalfEven, runSearch } from './engine';
import { EXAMPLE_CORPUS, EXAMPLE_QUERY } from './example';
import { DEFAULT_SETTINGS, querySchema } from './schema';
import { portRun, QUERY2, reproduces, SOURCE_RUNS } from './source-runs';

describe('the ported pipeline against the source CLI', () => {
  for (const run of SOURCE_RUNS) {
    it(`reproduces ${run.name}`, () => {
      expect(portRun(run)).toEqual(run.expected);
      expect(reproduces(run)).toBe(true);
    });
  }

  it('tells a run it does not reproduce from one it does', () => {
    const [first] = SOURCE_RUNS;
    expect(reproduces({ ...first, expected: { ...first.expected, status: first.expected.status === 'ready' ? 'shortfall' : 'ready' } })).toBe(false);
  });

  it('rounds soft scores as Python does, half to even', () => {
    const report = runSearch(EXAMPLE_CORPUS, QUERY2, { ...DEFAULT_SETTINGS, limit: 10 });
    // one token of six is 3 * 1/6 = 0.5, which Python rounds to 0
    expect(report.criteria['note-c'].softScores).toEqual([2, 0]);
    expect(report.criteria['note-e'].softScores).toEqual([3, 1]);
    expect([0.5, 1.5, 2.5, 0.75].map(roundHalfEven)).toEqual([0, 2, 2, 1]);
  });

  it('refuses a search with too few candidates instead of inventing matches', () => {
    const nothing = querySchema.parse({ ...EXAMPLE_QUERY, description: 'zeppelin' });
    expect(() => runSearch(EXAMPLE_CORPUS, nothing, DEFAULT_SETTINGS)).toThrow(PipelineError);
  });

  it('refuses a filter the source refuses', () => {
    expect(() => querySchema.parse({ ...EXAMPLE_QUERY, filters: [{ field: 'kind', op: 'Gte', value: 'guide' }] })).toThrow();
    expect(() => querySchema.parse({ ...EXAMPLE_QUERY, filters: [{ field: 'kind', op: 'Contains', value: 'guide' }] })).toThrow();
    expect(() => querySchema.parse({ ...EXAMPLE_QUERY, filters: [{ field: 'tags', op: 'In', value: 'cache' }] })).toThrow();
  });
});
