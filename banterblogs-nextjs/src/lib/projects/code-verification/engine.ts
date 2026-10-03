import { z } from 'zod';
import { CANDIDATE_SOURCES, intervalCandidates, uniqueCandidates } from './candidates';

export const SCHEMA_VERSION = 1;
export const FIXTURE_VERSION = 'neutral-v1';
export const MAX_ITEMS = 64;
export const MAX_STRING_LENGTH = 128;
export const MAX_ASSERTIONS = 16;
const MAX_COORDINATE = 1_000_000;
const MAX_JSON_CHARACTERS = 20_000;

const taskSchema = z.enum(['intervals', 'unique']);
const candidateSchema = z.enum(['empty', 'fixed', 'overfit', 'regression']);
const intervalSchema = z.tuple([
  z.number().finite().min(-MAX_COORDINATE).max(MAX_COORDINATE),
  z.number().finite().min(-MAX_COORDINATE).max(MAX_COORDINATE),
]).refine(([start, end]) => start <= end, 'Interval start must be at most its end.');
const intervalsSchema = z.array(intervalSchema).max(MAX_ITEMS);
const stringsSchema = z.array(z.string().max(MAX_STRING_LENGTH)).max(MAX_ITEMS);
const assertionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  input: z.unknown(), expected: z.unknown(),
}).passthrough();
const configSchema = z.object({
  taskId: taskSchema,
  candidateId: candidateSchema,
  mode: z.enum(['repair', 'synthesis']),
  scope: z.enum(['full', 'smoke']),
  assertions: z.array(assertionSchema).max(MAX_ASSERTIONS),
}).strict();

export type TaskId = z.infer<typeof taskSchema>;
export type CandidateId = z.infer<typeof candidateSchema>;
export type Value = [number, number][] | string[];
export interface Assertion { id: string; label: string; input: unknown; expected: unknown }
export interface Fixture extends Assertion { group: 'repair' | 'preserve' }
export interface RunConfig {
  taskId: TaskId; candidateId: CandidateId; mode: 'repair' | 'synthesis';
  scope: 'full' | 'smoke'; assertions: Assertion[];
}
export interface Task {
  id: TaskId; title: string; requirement: string; fault: string;
  tests: Fixture[];
}

export const CANDIDATES: { id: CandidateId; label: string; description: string }[] = [
  { id: 'fixed', label: 'General repair', description: 'Repairs the boundary rule without changing the ordering contract.' },
  { id: 'overfit', label: 'Example-only repair', description: 'Adds a special case for the first demonstration input.' },
  { id: 'regression', label: 'Repair + ordering regression', description: 'Repairs the bug but changes output ordering.' },
  { id: 'empty', label: 'Empty patch / baseline', description: 'Leaves the original buggy implementation unchanged.' },
];

export const TASKS: Task[] = [
  {
    id: 'intervals', title: 'Closed-interval union',
    requirement: 'Merge overlapping or touching closed intervals, including point intervals. Return ascending disjoint ranges without mutating the input.',
    fault: 'The baseline treats equality at an endpoint as a gap.',
    tests: [
      { id: 'touching', label: 'Touching pair', group: 'repair', input: [[1, 3], [3, 5]], expected: [[1, 5]] },
      { id: 'chain', label: 'Unsorted touching chain', group: 'repair', input: [[8, 10], [2, 4], [4, 8]], expected: [[2, 10]] },
      { id: 'point', label: 'Point on negative endpoint', group: 'repair', input: [[-5, -2], [-2, -2]], expected: [[-5, -2]] },
      { id: 'overlap', label: 'Existing overlap', group: 'preserve', input: [[1, 4], [2, 6]], expected: [[1, 6]] },
      { id: 'ordered', label: 'Separated ranges stay ascending', group: 'preserve', input: [[8, 9], [1, 2]], expected: [[1, 2], [8, 9]] },
      { id: 'empty', label: 'Empty input', group: 'preserve', input: [], expected: [] },
    ],
  },
  {
    id: 'unique', title: 'Stable case-fold deduplication',
    requirement: 'Trim strings, deduplicate by JavaScript lowercase equivalence, and keep the first trimmed spelling in insertion order. Empty strings remain valid items.',
    fault: 'The baseline uses exact-case keys, so case variants survive.',
    tests: [
      { id: 'alpha', label: 'Demonstration case variants', group: 'repair', input: ['alpha', 'ALPHA'], expected: ['alpha'] },
      { id: 'beta', label: 'Unseen case variants', group: 'repair', input: ['beta', 'BETA'], expected: ['beta'] },
      { id: 'accent', label: 'Accented case variants', group: 'repair', input: ['café', 'CAFÉ'], expected: ['café'] },
      { id: 'trim', label: 'Existing whitespace trimming', group: 'preserve', input: [' alpha ', 'alpha', 'beta'], expected: ['alpha', 'beta'] },
      { id: 'order', label: 'First-seen order is preserved', group: 'preserve', input: ['zeta', 'beta', 'alpha'], expected: ['zeta', 'beta', 'alpha'] },
      { id: 'empty', label: 'Empty input', group: 'preserve', input: [], expected: [] },
    ],
  },
];

export interface Observation { actual: Value; passed: boolean }
export type Transition = 'fail-pass' | 'pass-pass' | 'fail-fail' | 'pass-fail';
export interface ResultRow {
  id: string; label: string; group: 'repair' | 'preserve' | 'authored';
  input: Value; expected: Value; baseline: Observation; after: Observation; transition: Transition;
}
export interface Report {
  schemaVersion: number; fixtureVersion: string; runtime: 'browser-evaluation';
  config: RunConfig; patchPresent: boolean; resolved: boolean; reason: string;
  rows: ResultRow[];
  counts: { repaired: number; preserved: number; stillBroken: number; regressed: number };
}
export interface Session { config: RunConfig; report: Report | null }

export function initialConfig(taskId: TaskId = 'intervals'): RunConfig {
  return { taskId, candidateId: 'fixed', mode: 'repair', scope: 'full', assertions: [] };
}
export function resetSession(taskId: TaskId = 'intervals'): Session {
  return { config: initialConfig(taskId), report: null };
}
export function runSession(session: Session): Session {
  return { config: session.config, report: evaluate(session.config) };
}
export function getTask(taskId: TaskId): Task {
  taskSchema.parse(taskId);
  return TASKS.find(task => task.id === taskId)!;
}

export function parseJson(text: string): unknown {
  if (text.length > MAX_JSON_CHARACTERS) throw new Error(`JSON must be under ${MAX_JSON_CHARACTERS} characters.`);
  try { return JSON.parse(text); }
  catch { throw new Error('Enter a valid JSON array: quoted strings or [start, end] pairs.'); }
}

function validatedValue(taskId: TaskId, value: unknown): Value {
  if (taskId === 'intervals') return intervalsSchema.parse(value);
  return stringsSchema.parse(value);
}

export function execute(taskId: TaskId, candidateId: CandidateId, input: unknown): Value {
  taskSchema.parse(taskId);
  candidateSchema.parse(candidateId);
  if (taskId === 'intervals') return intervalCandidates[candidateId](intervalsSchema.parse(input));
  return uniqueCandidates[candidateId](stringsSchema.parse(input));
}

export function probe(taskId: TaskId, candidateId: CandidateId, input: unknown, expected: unknown): Observation {
  const oracle = validatedValue(taskSchema.parse(taskId), expected);
  const actual = execute(taskId, candidateId, input);
  return { actual, passed: JSON.stringify(actual) === JSON.stringify(oracle) };
}

export function evaluate(rawConfig: unknown): Report {
  const parsed = configSchema.parse(rawConfig);
  const config: RunConfig = {
    ...parsed, assertions: parsed.assertions.map(assertion => ({
      id: assertion.id, label: assertion.label,
      input: validatedValue(parsed.taskId, assertion.input),
      expected: validatedValue(parsed.taskId, assertion.expected),
    })),
  };
  if (new Set(config.assertions.map(a => a.id)).size !== config.assertions.length) throw new Error('Assertion IDs must be unique.');
  const task = getTask(config.taskId);
  const selected = config.mode === 'synthesis' ? config.assertions :
    config.scope === 'full' ? task.tests : [task.tests[0], task.tests[3]];
  const rows: ResultRow[] = selected.map(test => {
    const input = validatedValue(config.taskId, test.input);
    const expected = validatedValue(config.taskId, test.expected);
    const baseline = probe(config.taskId, 'empty', input, expected);
    const after = probe(config.taskId, config.mode === 'synthesis' ? 'fixed' : config.candidateId, input, expected);
    const group = config.mode === 'synthesis' ? 'authored' : (test as Fixture).group;
    if ((group === 'repair' && baseline.passed) || (group === 'preserve' && !baseline.passed)) {
      throw new Error(`Fixture ${test.id} has invalid baseline bucket polarity.`);
    }
    return {
      id: test.id, label: test.label, input, expected, group, baseline, after,
      transition: `${baseline.passed ? 'pass' : 'fail'}-${after.passed ? 'pass' : 'fail'}` as Transition,
    };
  });
  const counts = {
    repaired: rows.filter(r => r.transition === 'fail-pass').length,
    preserved: rows.filter(r => r.transition === 'pass-pass').length,
    stillBroken: rows.filter(r => r.transition === 'fail-fail').length,
    regressed: rows.filter(r => r.transition === 'pass-fail').length,
  };
  const patchPresent = config.mode === 'synthesis' ? rows.length > 0 : config.candidateId !== 'empty';
  const allPass = rows.length > 0 && rows.every(r => r.after.passed);
  const resolved = patchPresent && allPass && (config.mode === 'repair' || counts.repaired > 0);
  const reason = !patchPresent ? config.mode === 'repair' ? 'No implementation change was selected.' : 'No candidate assertions were supplied.' :
    config.mode === 'synthesis' && !allPass ? 'At least one assertion fails on the fixed code too, so its expected value is wrong.' :
    config.mode === 'synthesis' && counts.repaired === 0 ? 'No assertion reproduces the bug: none fails on the buggy code and passes on the fixed code.' :
    !allPass ? 'At least one required assertion still fails or regresses.' :
    config.mode === 'synthesis' ? 'At least one assertion reproduces the bug; all pass on fixed code.' :
    config.scope === 'smoke' ? 'The two-test smoke suite is satisfied. This is not full verification.' :
    'All repair and preservation tests pass with a non-empty implementation change.';
  return { schemaVersion: SCHEMA_VERSION, fixtureVersion: FIXTURE_VERSION, runtime: 'browser-evaluation', config, patchPresent, resolved, reason, rows, counts };
}

export function replay(raw: unknown): Report {
  const envelope = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), fixtureVersion: z.literal(FIXTURE_VERSION), runtime: z.literal('browser-evaluation'), config: configSchema }).parse(raw);
  return evaluate(envelope.config);
}

/** the implementation as written; candidates.ts keeps it beside the function, tested against it */
export function implementationSource(taskId: TaskId, candidateId: CandidateId): string {
  return CANDIDATE_SOURCES[taskSchema.parse(taskId)][candidateSchema.parse(candidateId)];
}

// Validate public fixtures on import, including the independent oracle and baseline polarity.
for (const task of TASKS) {
  const report = evaluate(initialConfig(task.id));
  if (!report.resolved) throw new Error(`Public fixture validation failed: ${task.id}.`);
}
