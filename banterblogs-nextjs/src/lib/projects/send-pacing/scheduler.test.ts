import { describe, expect, it } from 'vitest';
import { isoMicros, runReplay, type Replay } from './scheduler';
import SOURCE_RUNS from './source-runs.json';

// Eleven runs of tempoledger's own replay (python -B -m tempoledger.replay
// --seed S --count N --duration-hours H --start-hour T, NumPy 2.2.6), as
// recorded: every send time to the microsecond, every typing duration, pause
// and plan adjustment, every audit finding, and the summary statistics.

interface SourceRun {
  case: { seed: number; count: number; duration_hours: number; start_hour: number };
  send: string[];
  typing: number[];
  pause: boolean[];
  adjusted: boolean[];
  violations: [number, string][];
  stats: { count: number; pause_count: number; span_seconds: number; mean_interval_seconds: number; interval_cv: number; mean_wpm: number };
}

const RUNS = SOURCE_RUNS as SourceRun[];
const replayOf = (c: SourceRun['case']): Replay => ({ seed: c.seed, count: c.count, durationHours: c.duration_hours, startHour: c.start_hour });
// summary statistics are float sums; allow for summation order at the last bits
const CLOSE = 9;

describe('the ported scheduler against the source replay', () => {
  for (const run of RUNS) {
    const label = `seed ${run.case.seed}, ${run.case.count} messages, ${run.case.duration_hours} h from ${run.case.start_hour}:00`;
    it(`reproduces ${label}`, () => {
      const result = runReplay(replayOf(run.case));
      expect(result.schedule.map((r) => isoMicros(r.sendTime))).toEqual(run.send);
      expect(result.schedule.map((r) => r.typingDuration)).toEqual(run.typing);
      expect(result.schedule.map((r) => r.pause > 0)).toEqual(run.pause);
      expect(result.schedule.map((r) => r.distributionAdjusted)).toEqual(run.adjusted);
      expect(result.violations.map((v) => [v.index, v.code])).toEqual(run.violations);
      expect(result.stats.count).toBe(run.stats.count);
      expect(result.stats.pauseCount).toBe(run.stats.pause_count);
      expect(result.stats.spanSeconds).toBeCloseTo(run.stats.span_seconds, CLOSE);
      expect(result.stats.meanIntervalSeconds).toBeCloseTo(run.stats.mean_interval_seconds, CLOSE);
      expect(result.stats.intervalCv).toBeCloseTo(run.stats.interval_cv, CLOSE);
      expect(result.stats.meanWpm).toBeCloseTo(run.stats.mean_wpm, CLOSE);
    });
  }

  it("matches the source README's seed-7 summary", () => {
    const { stats, violations } = runReplay({ seed: 7, count: 12, durationHours: 2, startHour: 9 });
    expect(stats.pauseCount).toBe(7);
    expect(stats.spanSeconds).toBe(7085.445401);
    expect(violations.filter((v) => v.code === 'before_preparation')).toHaveLength(2);
  });
});
