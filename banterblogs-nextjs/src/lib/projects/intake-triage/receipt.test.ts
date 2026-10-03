import { describe, expect, it } from 'vitest';
import { FIXTURES } from './fixtures';
import { makeReceipt, replayReceipt } from './receipt';

describe('receipts', () => {
  it('replay every fixture message to the same signals', () => {
    for (const f of FIXTURES) expect(replayReceipt(JSON.parse(JSON.stringify(makeReceipt(f.signals))))).toEqual(f.signals);
  });

  it('refuse a decision that does not follow from the signals', () => {
    const forged = makeReceipt(FIXTURES.find((f) => f.id === 'shout')!.signals);
    forged.decision.urgency = 'P1';
    expect(() => replayReceipt(forged)).toThrow(/urgency does not follow/);
  });

  it('refuse an unknown version or an extra field', () => {
    const receipt = makeReceipt(FIXTURES[0].signals);
    expect(() => replayReceipt({ ...receipt, version: 'intake-triage.v0' })).toThrow();
    expect(() => replayReceipt({ ...receipt, note: 'extra' })).toThrow();
  });
});
