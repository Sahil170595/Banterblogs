import { describe, expect, it } from 'vitest';
import { EXAMPLE_QUERY } from './example';
import { ladder } from './ladder';
import { makeReceipt, replayReceipt } from './receipt';
import { DEFAULT_SETTINGS } from './schema';

describe('the relaxation ladder', () => {
  const rungs = ladder(EXAMPLE_QUERY, DEFAULT_SETTINGS);

  it('groups the example into three outcomes, the last open-ended', () => {
    expect(rungs.map((r) => [r.from, r.to])).toEqual([
      [1, 3],
      [4, 5],
      [6, null],
    ]);
    expect(rungs.map((r) => r.report!.dropped.map((f) => f.field))).toEqual([[], ['year', 'kind'], ['year', 'kind', 'collection']]);
  });

  it("finds the source's default threshold drops every filter and half its results break the request", () => {
    const atDefault = rungs.find((r) => r.from <= DEFAULT_SETTINGS.relax_threshold && (r.to === null || r.to >= DEFAULT_SETTINGS.relax_threshold))!;
    expect(atDefault.report!.status).toBe('ready');
    expect(atDefault.broken.filter((b) => b.length > 0)).toHaveLength(2);
    expect(rungs[0].report!.status).toBe('shortfall');
    expect(rungs[0].broken.every((b) => b.length === 0)).toBe(true);
  });
});

describe('receipts', () => {
  it('replay to the same query and settings', () => {
    const receipt = JSON.parse(JSON.stringify(makeReceipt(EXAMPLE_QUERY, DEFAULT_SETTINGS)));
    expect(replayReceipt(receipt)).toEqual({ query: EXAMPLE_QUERY, settings: DEFAULT_SETTINGS });
  });

  it('refuse results that do not follow', () => {
    const forged = makeReceipt(EXAMPLE_QUERY, DEFAULT_SETTINGS);
    forged.result.rejected = [];
    expect(() => replayReceipt(forged)).toThrow(/do not follow/);
    expect(() => replayReceipt({ ...makeReceipt(EXAMPLE_QUERY, DEFAULT_SETTINGS), version: 'v0' })).toThrow();
  });
});
