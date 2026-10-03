import { runReplay, SOURCE_REPLAY, type Replay } from './scheduler';

// The replay over many seeds: how often the audit finds each kind of
// violation, and how many messages land exactly on the campaign's end.

export const SWEEP_SEEDS = 1000;

export interface SweepRow {
  replay: Omit<Replay, 'seed'>;
  label: string;
  /** seeds whose schedule sends a message before it could have been typed */
  beforePreparation: number;
  /** seeds whose last two messages are both sent before they could have been typed */
  lastTwoLate: number;
  /** seeds whose schedule puts more than the burst limit in one window */
  burst: number;
  /** seeds with a send outside business hours */
  afterHours: number;
  /** messages per run, on average, sent at exactly the campaign's end */
  atEnd: number;
}

export const SWEEP_VARIANTS: { label: string; replay: Omit<Replay, 'seed'> }[] = [
  { label: 'the source replay: 12 over 2 hours from 09:00', replay: { count: SOURCE_REPLAY.count, durationHours: SOURCE_REPLAY.durationHours, startHour: SOURCE_REPLAY.startHour } },
  { label: '12 over 8 hours from 09:00', replay: { count: 12, durationHours: 8, startHour: 9 } },
  { label: '24 over 2 hours from 09:00', replay: { count: 24, durationHours: 2, startHour: 9 } },
  { label: '12 over 2 hours from 16:00', replay: { count: 12, durationHours: 2, startHour: 16 } },
];

export function sweep(seeds = SWEEP_SEEDS): SweepRow[] {
  return SWEEP_VARIANTS.map(({ label, replay }) => {
    let beforePreparation = 0;
    let lastTwoLate = 0;
    let burst = 0;
    let afterHours = 0;
    let atEnd = 0;
    for (let seed = 0; seed < seeds; seed++) {
      const result = runReplay({ seed, ...replay });
      const codes = new Set(result.violations.map((v) => v.code));
      if (codes.has('before_preparation')) beforePreparation++;
      const late = new Set(result.violations.filter((v) => v.code === 'before_preparation').map((v) => v.index));
      const n = result.schedule.length;
      if (late.has(n - 1) && late.has(n - 2)) lastTwoLate++;
      if (codes.has('burst_window')) burst++;
      if (codes.has('outside_business_hours')) afterHours++;
      atEnd += result.schedule.filter((row) => row.sendTime === result.end).length;
    }
    return { label, replay, beforePreparation, lastTwoLate, burst, afterHours, atEnd: atEnd / seeds };
  });
}
