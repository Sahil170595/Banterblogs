import { runSearch, type RunReport } from './engine';
import { EXAMPLE_CORPUS, EXAMPLE_QUERY } from './example';
import { DEFAULT_SETTINGS, querySchema, type Settings } from './schema';

// What StrataSearch's own offline CLI printed at the linked commit for its
// example corpus, `python -B -m stratasearch --output run.json` plus the
// flags named; scores rounded to nine places.

export type Row = [string, number];
export interface Expected {
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
const STRICT_BODY: Row[] = [
  ['note-a', 2.404163994],
  ['note-p', 2.274111471],
  ['note-d', 0.5133365],
];
const STRICT_META: Row[] = [
  ['note-a', 4.333333333],
  ['note-p', 4.0],
  ['note-d', 0.666666667],
];

export const QUERY2 = querySchema.parse({
  query_id: 'rounding-check',
  description: 'cache index latency query',
  hard_criteria: [],
  soft_criteria: ['cache index', 'latency query cache tuning partition replay'],
  filters: [
    { field: 'topic', op: 'Eq', value: 'storage' },
    { field: 'tags', op: 'Contains', value: 'cache' },
  ],
});

export interface SourceRun {
  name: string;
  query?: typeof EXAMPLE_QUERY;
  settings: Partial<Settings>;
  expected: Expected;
}

export const SOURCE_RUNS: SourceRun[] = [
  {
    name: 'default',
    settings: {},
    expected: {
      status: 'ready',
      attempts: RELAXED,
      primary: BODY,
      secondary: META,
      selected: FUSED_TOP,
      rejected: ['note-b', 'note-d', 'note-g', 'note-h'],
    },
  },
  {
    name: '--single-channel',
    settings: { hybrid: false },
    expected: {
      status: 'ready',
      attempts: RELAXED,
      primary: BODY,
      secondary: [],
      selected: BODY.slice(0, 4),
      rejected: ['note-b', 'note-g', 'note-d', 'note-h'],
    },
  },
  {
    name: '--relax-threshold 3',
    settings: { relax_threshold: 3 },
    expected: {
      status: 'shortfall',
      attempts: UNRELAXED,
      primary: STRICT_BODY,
      secondary: STRICT_META,
      selected: FUSED_TOP.slice(0, 2),
      rejected: ['note-d'],
    },
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
    expected: {
      status: 'shortfall',
      attempts: UNRELAXED,
      primary: STRICT_BODY,
      secondary: STRICT_META,
      selected: FUSED_TOP.slice(0, 2),
      rejected: ['note-d'],
    },
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

/** a channel or selection as the CLI prints it: id and score to nine places */
export const rows = (hits: { id: string; score: number }[]): Row[] => hits.map((h) => [h.id, Number(h.score.toFixed(9))]);

/** what the port prints for a recorded run, in the CLI's terms */
export function portRun({ query = EXAMPLE_QUERY, settings }: SourceRun): Expected {
  const report = runSearch(EXAMPLE_CORPUS, query, { ...DEFAULT_SETTINGS, ...settings });
  return {
    status: report.status,
    attempts: report.attempts.map((a) => [...a.filters.map((f) => f.field), a.count]),
    primary: rows(report.channels.primary),
    secondary: rows(report.channels.secondary),
    selected: rows(report.selected),
    rejected: report.rejected.map((c) => c.id),
  };
}

/** whether the port matches a recorded run in every channel, score, selection and rejection */
export const reproduces = (run: SourceRun) => JSON.stringify(portRun(run)) === JSON.stringify(run.expected);
