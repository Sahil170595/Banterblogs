import { describe, expect, it } from 'vitest';
import { analyze, compareGold, exportTrace, freshSession, MAX_TRACE_BYTES, prune, recordedVotes, replayTrace } from './engine';
import { fixtures } from './fixtures';
import { MAX_CELLS, type Session } from './types';

describe('synthetic spreadsheet reasoning', () => {
  it('evaluates cross-sheet dependencies and ranges, with deduplicated edges', () => {
    const result = analyze(freshSession());
    expect(result.cells['Calc!B4'].value).toBe(840);
    expect(result.cells['Report!B2'].value).toBe(840);
    expect(result.cells['Calc!B4'].precedents).toEqual(['Calc!B2', 'Calc!B3']);
    expect(result.cells['Calc!B4'].dependents).toEqual(['Calc!B5', 'Report!B2']);
    expect(result.cells['Inputs!B2'].dependents).toContain('Calc!B2');
  });
  it('exposes the checkpoint versus sink counterexample', () => {
    const result = analyze(freshSession());
    expect(result.cells['Calc!B4'].label).toBe('final');
    expect(result.cells['Report!B4'].label).toBe('final');
    const score = compareGold(freshSession(), result);
    expect(score).toMatchObject({ tp: 2, fp: 1, fn: 0, tn: 8 });
    expect(score?.f1).toBeCloseTo(0.8);
  });
  it('rejects malformed runtime boundaries instead of inventing results', () => {
    expect(() => analyze({ ...freshSession(), policy: 'unknown' } as never)).toThrow();
    const session = freshSession();
    session.workbook.cells.push({ ...session.workbook.cells[0] });
    expect(() => analyze(session)).toThrow(/Duplicate/);
  });
  it('handles precedence, unary signs and absolute references without eval', () => {
    const session = freshSession();
    session.workbook.cells[10].input = '=-(2+3)*$B$2/2';
    expect(analyze(session).cells['Report!B4'].value).toBe(-2100);
  });
  it('inherits a cross-sheet range endpoint and preserves separate local references', () => {
    const session = freshSession();
    session.workbook.cells[10].input = '=SUM(B3,Inputs!B2:B3)';
    const cell = analyze(session).cells['Report!B4'];
    expect(cell.value).toBe(872);
    expect(cell.precedents).toEqual(['Inputs!B2', 'Inputs!B3', 'Report!B3']);
  });
  it.each([
    ['=Missing!B2', /Unknown reference/],
    ['=B2/0', /Division by zero/],
    ['=AVERAGE(B2:B3)', /Supported formulas/],
    ['=SUM(B2:B9999)', /Range limit/],
    ['=SUM(B3:B2)', /Reversed range/],
    ['=2 trailing', /Unexpected/],
    ['=1e999', /Unexpected|finite/],
  ])('returns explicit cell errors for %s', (input, message) => {
    const session = freshSession();
    session.workbook.cells[10].input = input;
    const cell = analyze(session).cells['Report!B4'];
    expect(cell.error).toMatch(message);
    expect(cell.value).toBeNull();
    expect(cell.label).toBe('invalid');
  });
  it('detects cycles and propagates dependency errors', () => {
    const session = freshSession('broken');
    const result = analyze(session);
    expect(result.cells['Calc!B2'].error).toMatch(/Cycle/);
    expect(result.cells['Calc!B4'].error).toMatch(/Dependency/);
    expect(result.cells['Report!B3'].error).toMatch(/Unknown reference/);
    expect(Object.values(result.cells).every(c => c.value === null || Number.isFinite(c.value))).toBe(true);
  });
  it('keeps adjudication prune-only and rejects invalid edits', () => {
    const session = freshSession();
    expect(() => prune(session, 'Inputs!B2', 'drop')).toThrow(/proposed finals/);
    const edited = prune(session, 'Report!B4', 'drop');
    expect(analyze(edited).cells['Report!B4'].label).toBe('intermediate');
    expect(compareGold(edited, analyze(edited))?.f1).toBe(1);
    expect(analyze(session).cells['Report!B4'].label).toBe('final');
  });
  it('invalidates recorded ballots and gold after workbook edits', () => {
    const session = freshSession();
    expect(recordedVotes(session)?.['Report!B2']).toEqual(['final', 'intermediate', 'final']);
    session.workbook.cells[0].input = '42';
    expect(recordedVotes(session)).toBeNull();
    expect(compareGold(session, analyze(session))).toBeNull();
  });
  it('policy changes recompute decisions without mutating fixtures', () => {
    const session = freshSession();
    session.policy = 'precision';
    expect(analyze(session).cells['Calc!B4'].label).toBe('review');
    expect(analyze(freshSession()).cells['Calc!B4'].label).toBe('final');
  });
  it('exports a deterministic versioned replay and reset restores baseline', () => {
    const session = prune(freshSession(), 'Report!B4', 'drop');
    const trace = exportTrace(session);
    expect(trace.version).toBe('spreadsheet-reasoning/v1');
    expect(exportTrace(JSON.parse(JSON.stringify(trace.session)))).toEqual(trace);
    expect(freshSession().workbook).toEqual(fixtures.baseline.workbook);
    expect(freshSession().adjudications).toEqual({});
  });

  it('round-trips a dense acyclic workbook without exporting expanded evidence', () => {
    const column = (n: number): string => n <= 26 ? String.fromCharCode(64 + n) : `A${String.fromCharCode(64 + n - 26)}`;
    const session: Session = {
      fixture: 'baseline', policy: 'balanced', adjudications: {},
      workbook: { sheets: [{ name: 'Custom', role: 'output' }], cells: Array.from({ length: MAX_CELLS }, (_, i) => ({
        sheet: 'Custom', address: `${column(i + 1)}1`, label: 'Item', emphasis: false,
        input: i ? `=SUM(A1:${column(i)}1)` : '1',
      })) },
    };
    const result = analyze(session);
    expect(result.edges).toHaveLength(1128);
    expect(Object.values(result.cells).every(c => c.error === null)).toBe(true);
    const trace = exportTrace(session);
    expect(Object.keys(trace).sort()).toEqual(['session', 'version']);
    const json = JSON.stringify(trace);
    expect(new TextEncoder().encode(json).byteLength).toBeLessThanOrEqual(MAX_TRACE_BYTES);
    const replayed = replayTrace(JSON.parse(json));
    expect(replayed).toEqual(session);
    expect(analyze(replayed)).toEqual(result);
  });

  it('keeps maximum-length escaped fields within the replay byte budget', () => {
    const session = freshSession();
    session.workbook = {
      sheets: [{ name: 'Custom', role: 'output' }],
      cells: Array.from({ length: MAX_CELLS }, (_, i) => ({
        sheet: 'Custom', address: `A${i + 1}`, label: '\u0000'.repeat(80),
        input: '\u0000'.repeat(256), emphasis: false,
      })),
    };
    const json = JSON.stringify(exportTrace(session));
    expect(new TextEncoder().encode(json).byteLength).toBeLessThanOrEqual(MAX_TRACE_BYTES);
    expect(replayTrace(JSON.parse(json))).toEqual(session);
  });

  it('validates replay sessions and ignores forged legacy derived evidence', () => {
    const session = prune(freshSession(), 'Report!B4', 'drop');
    const trace = { ...exportTrace(session), result: { forged: true }, goldComparison: { f1: 1 } };
    expect(analyze(replayTrace(trace))).toEqual(analyze(session));
    for (const invalid of [null, {}, { ...trace, version: 'unsupported' },
      { ...trace, session: { ...session, policy: 'unknown' } },
      { ...trace, session: { ...session, adjudications: { 'Missing!A1': 'drop' } } }]) {
      expect(() => replayTrace(invalid)).toThrow();
    }
    expect(() => exportTrace({ ...session, adjudications: { 'Missing!A1': 'drop' } })).toThrow();
  });
});
