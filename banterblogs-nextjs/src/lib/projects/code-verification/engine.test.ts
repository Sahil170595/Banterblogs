import { describe, expect, it } from 'vitest';
import { TASKS, evaluate, execute, implementationSource, probe, replay, initialConfig, resetSession, runSession } from './engine';

describe('curated verifier contract', () => {
  for (const taskId of ['intervals', 'unique'] as const) {
    it(`${taskId}: validates baseline bucket polarity and non-mutating fixtures`, () => {
      const before = JSON.stringify(TASKS);
      const report = evaluate({ ...initialConfig(taskId), candidateId: 'fixed' });
      expect(report.rows.filter(r => r.group === 'repair').every(r => !r.baseline.passed)).toBe(true);
      expect(report.rows.filter(r => r.group === 'preserve').every(r => r.baseline.passed)).toBe(true);
      expect(report.resolved).toBe(true);
      expect(report.counts).toEqual({ repaired: 3, preserved: 3, stillBroken: 0, regressed: 0 });
      expect(JSON.stringify(TASKS)).toBe(before);
    });
    it(`${taskId}: empty patches never resolve`, () => {
      const report = evaluate({ ...initialConfig(taskId), candidateId: 'empty' });
      expect(report.resolved).toBe(false);
      expect(report.patchPresent).toBe(false);
      expect(report.counts.stillBroken).toBe(3);
    });
    it(`${taskId}: an overfit passes smoke but fails full verification`, () => {
      const config = { ...initialConfig(taskId), candidateId: 'overfit' as const };
      expect(evaluate({ ...config, scope: 'smoke' }).resolved).toBe(true);
      const full = evaluate(config);
      expect(full.resolved).toBe(false);
      expect(full.counts.stillBroken).toBe(2);
    });
    it(`${taskId}: solving all repair tests cannot hide regression`, () => {
      const report = evaluate({ ...initialConfig(taskId), candidateId: 'regression' });
      expect(report.counts.repaired).toBe(3);
      expect(report.counts.regressed).toBe(1);
      expect(report.resolved).toBe(false);
    });
    it(`${taskId}: synthesis needs a discriminating assertion`, () => {
      const task = TASKS.find(t => t.id === taskId)!;
      const reproducer = task.tests[0];
      const existing = task.tests[3];
      const base = { ...initialConfig(taskId), mode: 'synthesis' as const };
      expect(evaluate({ ...base, assertions: [reproducer] }).resolved).toBe(true);
      expect(evaluate({ ...base, assertions: [existing] }).resolved).toBe(false);
      expect(evaluate({ ...base, assertions: [] }).resolved).toBe(false);
      expect(evaluate({ ...base, assertions: [{ ...reproducer, expected: [] }] }).resolved).toBe(false);
      const mixed = evaluate({ ...base, assertions: [reproducer, { ...existing, id: 'wrong', expected: [] }] });
      if (taskId === 'intervals') expect(() => evaluate({ ...base, assertions: [{ ...reproducer, expected: ['wrong'] }] })).toThrow();
      else expect(mixed.resolved).toBe(false);
    });
    it(`${taskId}: deterministic JSON replay and reset`, () => {
      const session = runSession(resetSession(taskId));
      expect(replay(JSON.parse(JSON.stringify(session.report)))).toEqual(session.report);
      expect(resetSession(taskId).report).toBeNull();
      expect(resetSession(taskId).config).toEqual(initialConfig(taskId));
    });
  }
  it('reports per-test input, expected and genuine actual values', () => {
    const report = evaluate({ ...initialConfig(), candidateId: 'empty' });
    expect(report.rows[0].baseline.actual).toEqual([[1, 3], [3, 5]]);
    expect(report.rows[0].after.actual).toEqual([[1, 3], [3, 5]]);
    expect(report.rows[0].expected).toEqual([[1, 5]]);
  });
  it('probes new inputs without assigning their oracle from the chosen candidate', () => {
    expect(probe('intervals', 'empty', [[2, 4], [4, 9]], [[2, 9]]).passed).toBe(false);
    expect(probe('unique', 'fixed', ['Omega', 'OMEGA'], ['Omega']).passed).toBe(true);
  });
  it('checks independent interval membership, disjointness, ordering and non-mutation over 225 input pairs', () => {
    const intervals: [number, number][] = [];
    for (let start = -2; start <= 2; start++) for (let end = start; end <= 2; end++) intervals.push([start, end]);
    for (const first of intervals) for (const second of intervals) {
      const input = [second, first];
      const snapshot = JSON.stringify(input);
      const output = execute('intervals', 'fixed', input) as [number, number][];
      expect(JSON.stringify(input)).toBe(snapshot);
      for (let index = 1; index < output.length; index++) expect(output[index - 1][1]).toBeLessThan(output[index][0]);
      for (let point = -2; point <= 2; point += .5) {
        const covers = (ranges: [number, number][]) => ranges.some(([start, end]) => start <= point && point <= end);
        expect(covers(output)).toBe(covers(input));
      }
    }
  });
  it('preserves first spelling, empty items and input ownership for a new deduplication counterexample', () => {
    const input = [' Zulu ', 'zULU', '', ' ', 'Alpha', 'ALPHA'];
    expect(execute('unique', 'fixed', input)).toEqual(['Zulu', '', 'Alpha']);
    expect(input).toEqual([' Zulu ', 'zULU', '', ' ', 'Alpha', 'ALPHA']);
  });
  it.each([null, 'bad', [[3, 1]], [[0, Infinity]], [[1]], [[1, 2, 3]], Array.from({ length: 65 }, () => [0, 1])])('rejects invalid interval input %j', input => {
    expect(() => probe('intervals', 'fixed', input, [])).toThrow();
  });
  it.each([null, [3], ['x'.repeat(129)], Array.from({ length: 65 }, () => 'a')])('rejects invalid string input %j', input => {
    expect(() => probe('unique', 'fixed', input, [])).toThrow();
  });
  it('rejects unknown configuration, duplicate assertions and oversized suites', () => {
    expect(() => evaluate({ ...initialConfig(), taskId: 'nope' })).toThrow();
    expect(() => evaluate({ ...initialConfig(), scope: 'nope' })).toThrow();
    expect(() => evaluate({ ...initialConfig(), candidateId: 'nope' })).toThrow();
    const assertion = TASKS[0].tests[0];
    expect(() => evaluate({ ...initialConfig(), mode: 'synthesis', assertions: [assertion, assertion] })).toThrow();
    expect(() => evaluate({ ...initialConfig(), mode: 'synthesis', assertions: Array.from({ length: 17 }, (_, i) => ({ ...assertion, id: `case-${i}` })) })).toThrow();
  });
  it('rejects tampered export versions and ignores forged verdicts during replay', () => {
    const report = evaluate(initialConfig());
    expect(() => replay({ ...report, schemaVersion: 999 })).toThrow();
    expect(replay({ ...report, resolved: !report.resolved }).resolved).toBe(report.resolved);
  });
  it('replays a maximum-sized bounded authored configuration', () => {
    const input = Array.from({ length: 64 }, (_, i) => `${i}-${'a'.repeat(124)}`);
    const report = evaluate({ ...initialConfig('unique'), mode: 'synthesis', assertions: Array.from({ length: 16 }, (_, i) => ({ id: `large-${i}`, label: 'Bounded large assertion', input, expected: input })) });
    expect(replay(JSON.parse(JSON.stringify(report)))).toEqual(report);
  });
  it('exposes the actual implementations each patch replaces the buggy one with', () => {
    expect(implementationSource('intervals', 'fixed')).toContain('<=');
    expect(implementationSource('intervals', 'fixed')).not.toBe(implementationSource('intervals', 'empty'));
    expect(implementationSource('unique', 'fixed')).toContain('toLowerCase');
  });
});
