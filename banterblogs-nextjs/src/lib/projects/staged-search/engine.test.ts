import { describe, expect, it } from 'vitest';
import { PipelineError, roundHalfEven, runSearch, type RunReport } from './engine';
import { EXAMPLE_CORPUS, EXAMPLE_QUERY } from './example';
import { DEFAULT_SETTINGS, querySchema, type Settings } from './schema';

// What StrataSearch's own offline CLI printed at the linked commit for its
// example corpus, `python -B -m stratasearch --output run.json` plus the
// flags named; scores rounded to nine places.

type Row = [string, number];
interface Expected {
  status: RunReport['status'];
  attempts: (string | number)[][];
  primary: Row[];
  secondary: Row[];
  selected: Row[];
  rejected: string[];
}

const BODY: Row[] = [
  ['note-a', 2.404163994],
  ['note-p', 2.274111471],
  ['note-e', 1.992981861],
  ['note-c', 1.30919767],
  ['note-m', 1.30919767],
  ['note-b', 0.559395482],
  ['note-g', 0.559395482],
  ['note-d', 0.5133365],
  ['note-h', 0.500338529],
];
const META: Row[] = [
  ['note-a', 4.333333333],
  ['note-p', 4.0],
  ['note-e', 2.333333333],
  ['note-c', 1.666666667],
  ['note-m', 1.666666667],
  ['note-b', 0.666666667],
  ['note-d', 0.666666667],
  ['note-g', 0.666666667],
  ['note-h', 0.666666667],
];
const RELAXED = [['year', 'kind', 'collection', 3], ['kind', 'collection', 3], ['collection', 5], [9]];
const UNRELAXED = [['year', 'kind', 'collection', 3]];
const FUSED_TOP: Row[] = [
  ['note-a', 0.032786885],
  ['note-p', 0.032258065],
  ['note-e', 0.031746032],
  ['note-c', 0.03125],
];
const STRICT_BODY: Row[] = [['note-a', 2.404163994], ['note-p', 2.274111471], ['note-d', 0.5133365]];
const STRICT_META: Row[] = [['note-a', 4.333333333], ['note-p', 4.0], ['note-d', 0.666666667]];

const QUERY2 = querySchema.parse({
  query_id: 'rounding-check',
  description: 'cache index latency query',
  hard_criteria: [],
  soft_criteria: ['cache index', 'latency query cache tuning partition replay'],
  filters: [
    { field: 'topic', op: 'Eq', value: 'storage' },
    { field: 'tags', op: 'Contains', value: 'cache' },
  ],
});

const CASES: { name: string; query?: typeof EXAMPLE_QUERY; settings: Partial<Settings>; expected: Expected }[] = [
  {
    name: 'default',
    settings: {},
    expected: { status: 'ready', attempts: RELAXED, primary: BODY, secondary: META, selected: FUSED_TOP, rejected: ['note-b', 'note-d', 'note-g', 'note-h'] },
  },
  {
    name: '--single-channel',
    settings: { hybrid: false },
    expected: { status: 'ready', attempts: RELAXED, primary: BODY, secondary: [], selected: BODY.slice(0, 4), rejected: ['note-b', 'note-g', 'note-d', 'note-h'] },
  },
  {
    name: '--relax-threshold 3',
    settings: { relax_threshold: 3 },
    expected: { status: 'shortfall', attempts: UNRELAXED, primary: STRICT_BODY, secondary: STRICT_META, selected: FUSED_TOP.slice(0, 2), rejected: ['note-d'] },
  },
  {
    name: '--limit 10',
    settings: { limit: 10 },
    expected: {
      status: 'shortfall',
      attempts: RELAXED,
      primary: BODY,
      secondary: META,
      selected: [...FUSED_TOP, ['note-m', 0.030769231]],
      rejected: ['note-b', 'note-d', 'note-g', 'note-h'],
    },
  },
  {
    name: '--relax-threshold 1',
    settings: { relax_threshold: 1 },
    expected: { status: 'shortfall', attempts: UNRELAXED, primary: STRICT_BODY, secondary: STRICT_META, selected: FUSED_TOP.slice(0, 2), rejected: ['note-d'] },
  },
  {
    name: 'a second query, --limit 10',
    query: QUERY2,
    settings: { limit: 10 },
    expected: {
      status: 'shortfall',
      attempts: [['topic', 'tags', 2], ['tags', 5], [8]],
      primary: [
        ['note-e', 2.314643197],
        ['note-a', 1.861470663],
        ['note-p', 1.760774971],
        ['note-n', 1.104979594],
        ['note-b', 0.919023789],
        ['note-g', 0.919023789],
        ['note-c', 0.749802189],
        ['note-m', 0.749802189],
      ],
      secondary: [
        ['note-a', 2.0],
        ['note-e', 1.75],
        ['note-p', 1.75],
        ['note-c', 1.25],
        ['note-m', 1.25],
        ['note-b', 0.75],
      ],
      selected: [
        ['note-e', 0.032522475],
        ['note-a', 0.032522475],
        ['note-p', 0.031746032],
        ['note-c', 0.030550373],
        ['note-b', 0.030536131],
        ['note-m', 0.030090498],
        ['note-g', 0.015151515],
        ['note-n', 0.015625],
      ],
      rejected: [],
    },
  },
];

const rows = (hits: { id: string; score: number }[]): Row[] => hits.map((h) => [h.id, Number(h.score.toFixed(9))]);

describe('the ported pipeline against the source CLI', () => {
  for (const { name, query = EXAMPLE_QUERY, settings, expected } of CASES) {
    it(`reproduces ${name}`, () => {
      const report = runSearch(EXAMPLE_CORPUS, query, { ...DEFAULT_SETTINGS, ...settings });
      expect(report.status).toBe(expected.status);
      expect(report.attempts.map((a) => [...a.filters.map((f) => f.field), a.count])).toEqual(expected.attempts);
      expect(rows(report.channels.primary)).toEqual(expected.primary);
      expect(rows(report.channels.secondary)).toEqual(expected.secondary);
      expect(rows(report.selected)).toEqual(expected.selected);
      expect(report.rejected.map((c) => c.id)).toEqual(expected.rejected);
    });
  }

  it("rounds soft scores as Python does, half to even", () => {
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
