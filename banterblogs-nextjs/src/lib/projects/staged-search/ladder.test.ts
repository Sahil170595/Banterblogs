import { describe, expect, it } from 'vitest';
import { EXAMPLE_QUERY } from './example';
import { ladder } from './ladder';
import { LAB_MAX_LIMIT, LAB_MAX_THRESHOLD, makeReceipt, replayReceipt } from './receipt';
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

  // live QA: a query with no candidates read "1 to 50", past the menu's twelve
  it('leaves the top row open when every threshold the ladder tries gives the same outcome', () => {
    const none = ladder({ ...EXAMPLE_QUERY, description: 'zzzz nothing matches' }, DEFAULT_SETTINGS);
    expect(none.map((r) => [r.from, r.to])).toEqual([[1, null]]);
    expect(none[0].report).toBeNull();
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

  // live QA: a file with threshold 13 or 11 results loaded, and the menus showed 1
  it('refuse settings the lab’s menus cannot show, and take every one they can', () => {
    for (const settings of [
      { ...DEFAULT_SETTINGS, relax_threshold: LAB_MAX_THRESHOLD + 1 },
      { ...DEFAULT_SETTINGS, limit: LAB_MAX_LIMIT + 1 },
      { ...DEFAULT_SETTINGS, minimum_candidates: 2 },
    ]) {
      expect(() => replayReceipt(JSON.parse(JSON.stringify(makeReceipt(EXAMPLE_QUERY, settings)))), JSON.stringify(settings)).toThrow();
    }
    const edges = { ...DEFAULT_SETTINGS, relax_threshold: LAB_MAX_THRESHOLD, limit: LAB_MAX_LIMIT };
    expect(replayReceipt(JSON.parse(JSON.stringify(makeReceipt(EXAMPLE_QUERY, edges)))).settings).toEqual(edges);
  });
});
