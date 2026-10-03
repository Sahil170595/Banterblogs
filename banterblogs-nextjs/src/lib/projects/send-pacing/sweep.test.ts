import { describe, expect, it } from 'vitest';
import { makeReceipt, replayReceipt } from './receipt';
import { runReplay, SOURCE_REPLAY } from './scheduler';
import { sweep } from './sweep';

describe('the seed sweep', () => {
  const rows = sweep();

  it('finds every source-replay schedule sending a message before it could be typed', () => {
    expect(rows[0]).toMatchObject({ beforePreparation: 1000, lastTwoLate: 1000, burst: 99, afterHours: 0 });
    // three messages per run land on the campaign's final instant
    expect(rows[0].atEnd).toBeGreaterThanOrEqual(3);
  });

  it('traces it to the quarter-hour plan: clock hours added to the start, clamped to the end', () => {
    const result = runReplay(SOURCE_REPLAY);
    const clockHourSeconds = 9 * 3600;
    // the plan's last three offsets are clock-hour values, past a 2-hour horizon, so they clamp
    expect(result.distribution.slice(-3)).toEqual([7200, 7200, 7200]);
    expect(clockHourSeconds).toBeGreaterThan(SOURCE_REPLAY.durationHours * 3600);
    const late = result.violations.filter((v) => v.code === 'before_preparation').map((v) => v.index);
    expect(late).toEqual([result.schedule.length - 2, result.schedule.length - 1]);
  });
});

describe('receipts', () => {
  it('replay to the same parameters', () => {
    expect(replayReceipt(JSON.parse(JSON.stringify(makeReceipt(SOURCE_REPLAY))))).toEqual(SOURCE_REPLAY);
  });

  it('refuse send times that do not follow', () => {
    const forged = makeReceipt(SOURCE_REPLAY);
    forged.sendTimes[0] = '2030-01-07T09:00:00+00:00';
    expect(() => replayReceipt(forged)).toThrow(/do not follow/);
  });
});
