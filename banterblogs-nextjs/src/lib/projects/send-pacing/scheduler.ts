import { z } from 'zod';
import { randomState, type RandomState } from './random';

// tempoledger's scheduler (tempoledger/scheduling/engine.py), its audit
// (scheduling/audit.py) and its replay (replay.py), ported step for step.
// Times are whole microseconds since the epoch, because Python's datetime is;
// every timedelta(seconds=x) rounds x to the microsecond, half to even.

const US = 1_000_000;
const MINUTE = 60 * US;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** the source's Settings defaults for the timing fields */
export const SOURCE_SETTINGS = {
  wpmMean: 50,
  wpmStd: 15,
  wpmMin: 30,
  wpmMax: 80,
  pauseProbability: 0.4,
  pauseLambda: 0.08,
  businessStart: 9,
  businessEnd: 17,
  minIntervalVariance: 100,
  maxBurst: 3,
  burstWindowSeconds: 90,
};
export type Settings = typeof SOURCE_SETTINGS;

// the engine's own constants
const PAUSE_MIN = 5;
const PAUSE_MAX = 45;
const CLUSTER_WINDOW_SECONDS = 300;
const CLUSTER_STD_SECONDS = 180;
const PEAK_HOURS = [10, 11, 14, 15];
const QUARTERS = [0, 15, 30, 45];
const PEAK_WINDOWS: [number, number][] = [
  [10 * 3600, 11 * 3600],
  [14 * 3600, 15 * 3600],
];
const PLAN_HOURS: [number, number] = [9, 17];
const PEAK_SHARE = 0.3;
const SPREAD_SHARE = 0.5;
const VARIANCE_GAMMA_SHAPE = 2;
const VARIANCE_GAMMA_SCALE = 30;
const REPEAT_TOLERANCE_SECONDS = 5;
const REPEAT_STD_SECONDS = 20;
const BURST_DELAY: [number, number] = [30, 60];

export const replaySchema = z
  .object({
    seed: z.number().int().min(0).max(0xffffffff),
    count: z.number().int().min(1).max(48),
    durationHours: z.number().positive().max(24),
    startHour: z.number().int().min(0).max(23),
  })
  .strict();
export type Replay = z.infer<typeof replaySchema>;
/** the replay CLI's defaults: seed 7, twelve messages over two hours from 09:00 */
export const SOURCE_REPLAY: Replay = { seed: 7, count: 12, durationHours: 2, startHour: 9 };
/** the replay's fixed date, 2030-01-07 */
const REPLAY_DAY = Date.UTC(2030, 0, 7) * 1000;

/** Python's round(): halves go to the even neighbour */
function roundHalfEven(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  return d > 0.5 ? f + 1 : d < 0.5 ? f : f % 2 === 0 ? f : f + 1;
}
/** timedelta(seconds=x), in microseconds */
const seconds = (x: number) => roundHalfEven(x * US);
/** timedelta.total_seconds() */
const totalSeconds = (us: number) => us / US;
const clip = (x: number, low: number, high: number) => Math.min(Math.max(x, low), high);
const dayOf = (t: number) => Math.floor(t / DAY) * DAY;
const timeOfDay = (t: number) => t - dayOf(t);

/** the close of business on the day a campaign starts, in epoch microseconds */
export const businessClose = (start: number) => dayOf(start) + SOURCE_SETTINGS.businessEnd * HOUR;

// NumPy's pairwise float sum, as add.reduce runs it from the first element
function pairwise(a: number[], from: number, n: number): number {
  if (n < 8) {
    let res = 0;
    for (let i = 0; i < n; i++) res += a[from + i];
    return res;
  }
  if (n <= 128) {
    const r = a.slice(from, from + 8);
    let i = 8;
    for (; i < n - (n % 8); i += 8) for (let j = 0; j < 8; j++) r[j] += a[from + i + j];
    let res = r[0] + r[1] + (r[2] + r[3]) + (r[4] + r[5] + (r[6] + r[7]));
    for (; i < n; i++) res += a[from + i];
    return res;
  }
  let n2 = Math.floor(n / 2);
  n2 -= n2 % 8;
  return pairwise(a, from, n2) + pairwise(a, from + n2, n - n2);
}
const npSum = (a: number[]) => (a.length ? a[0] + pairwise(a, 1, a.length - 1) : 0);
const npMean = (a: number[]) => npSum(a) / a.length;
const npVar = (a: number[]) => {
  const m = npMean(a);
  return npSum(a.map((x) => (x - m) * (x - m))) / a.length;
};

export interface Scheduled {
  index: number;
  content: string;
  /** when the scheduler started preparing it: the previous message's send time */
  preparedFrom: number;
  /** sampled typing time plus any pause, in seconds */
  typingDuration: number;
  wpm: number;
  pause: number;
  clusterBias: number | null;
  jitterApplied: number;
  distributionAdjusted: boolean;
  sendTime: number;
}

export type ViolationCode = 'outside_campaign' | 'outside_business_hours' | 'out_of_order' | 'before_preparation' | 'burst_window';
export interface Violation {
  index: number;
  code: ViolationCode;
}

export interface ReplayResult {
  start: number;
  end: number;
  /** in send order, as schedule_campaign returns them */
  schedule: Scheduled[];
  /** the planned offsets from the start, in seconds, sorted */
  distribution: number[];
  violations: Violation[];
  stats: { count: number; pauseCount: number; spanSeconds: number; meanIntervalSeconds: number; intervalCv: number; meanWpm: number };
}

/** how the campaign plan splits its messages: busy windows, uniform, quarter hours */
export function planShares(count: number) {
  const peak = Math.floor(count * PEAK_SHARE);
  const spread = Math.floor(count * SPREAD_SHARE);
  return { peak, spread, quarter: count - peak - spread };
}

function scheduler(rng: RandomState, s: Settings) {
  function nextCluster(t: number): number | null {
    const hour = Math.floor(timeOfDay(t) / HOUR);
    const minute = Math.floor((timeOfDay(t) % HOUR) / MINUTE);
    if (PEAK_HOURS.includes(hour)) {
      const quarter = QUARTERS.find((q) => q > minute);
      if (quarter !== undefined) return dayOf(t) + hour * HOUR + quarter * MINUTE;
    }
    return PEAK_HOURS.includes(hour + 1) ? dayOf(t) + (hour + 1) * HOUR : null;
  }

  function biasTowardCluster(base: number, cluster: number): number {
    if (totalSeconds(cluster - base) < 0) return base;
    const target = base + seconds(rng.normal(0, CLUSTER_STD_SECONDS));
    return target > cluster ? cluster : target;
  }

  function intervalJitter(proposed: number, history: Scheduled[]): number {
    if (history.length < 3) return proposed;
    const intervals = history.slice(1).map((h, i) => totalSeconds(h.sendTime - history[i].sendTime));
    if (npVar(intervals) < s.minIntervalVariance) proposed += seconds(rng.gamma(VARIANCE_GAMMA_SHAPE, VARIANCE_GAMMA_SCALE));
    const proposedInterval = totalSeconds(proposed - history[history.length - 1].sendTime);
    if (intervals.some((interval) => Math.abs(proposedInterval - interval) < REPEAT_TOLERANCE_SECONDS)) {
      proposed += seconds(rng.normal(0, REPEAT_STD_SECONDS));
    }
    const windowStart = proposed - seconds(s.burstWindowSeconds);
    const recent = history.slice(-s.maxBurst).map((h) => h.sendTime);
    if (recent.filter((t) => t > windowStart).length >= s.maxBurst) proposed += seconds(rng.uniform(BURST_DELAY[0], BURST_DELAY[1]));
    return proposed;
  }

  function businessHours(t: number): number {
    const clock = timeOfDay(t);
    if (clock < s.businessStart * HOUR) return dayOf(t) + s.businessStart * HOUR;
    if (clock > s.businessEnd * HOUR) return dayOf(t) + s.businessStart * HOUR + DAY;
    return t;
  }

  function businessHoursWithin(t: number, start: number, end: number): number {
    if (t < start) t = start;
    else if (t > end) t = end;
    const clock = timeOfDay(t);
    if (clock < s.businessStart * HOUR) {
      const opening = dayOf(t) + s.businessStart * HOUR;
      if (opening >= start && opening <= end) t = opening;
      else if (t < start) t = start;
    } else if (clock > s.businessEnd * HOUR) {
      const closing = dayOf(t) + s.businessEnd * HOUR;
      if (closing >= start && closing <= end) t = closing;
      else if (t > end) t = end;
    }
    return t;
  }

  function distribute(count: number, durationHours: number): number[] {
    const total = durationHours * 3600;
    const { peak, spread, quarter: clustered } = planShares(count);
    const plan: number[] = [];
    for (let i = 0; i < peak; i++) {
      const [ws, we] = PEAK_WINDOWS[rng.randint(0, PEAK_WINDOWS.length)];
      const low = Math.min(ws, total);
      const high = Math.min(we, total);
      plan.push(low < high ? rng.uniform(low, high) : rng.uniform(0, total));
    }
    for (let i = 0; i < spread; i++) plan.push(rng.uniform(0, total));
    for (let i = 0; i < clustered; i++) {
      // the source fixes these hours here, whatever the business hours are set to
      const hour = rng.randint(PLAN_HOURS[0], PLAN_HOURS[1]);
      const quarter = QUARTERS[rng.randint(0, QUARTERS.length)];
      plan.push(clip(hour * 3600 + quarter * 60 + rng.normal(0, CLUSTER_STD_SECONDS), 0, total));
    }
    return plan.sort((a, b) => a - b);
  }

  function scheduleMessage(index: number, content: string, history: Scheduled[], current: number): Scheduled {
    const wpm = clip(rng.normal(s.wpmMean, s.wpmStd), s.wpmMin, s.wpmMax);
    const words = content.split(/\s+/).filter(Boolean).length;
    let typing = (words / wpm) * 60;
    let pause = 0;
    if (rng.random() < s.pauseProbability) {
      pause = clip(rng.exponential(1.0 / s.pauseLambda), PAUSE_MIN, PAUSE_MAX);
      typing += pause;
    }
    const base = current + seconds(typing);
    const cluster = nextCluster(current);
    let target = base;
    let clusterBias: number | null = null;
    if (cluster !== null && totalSeconds(cluster - current) < typing + CLUSTER_WINDOW_SECONDS) {
      target = biasTowardCluster(base, cluster);
      clusterBias = cluster;
    }
    target = businessHours(intervalJitter(target, history));
    return {
      index,
      content,
      preparedFrom: current,
      typingDuration: typing,
      wpm,
      pause,
      clusterBias,
      jitterApplied: totalSeconds(target - base),
      distributionAdjusted: false,
      sendTime: target,
    };
  }

  return { distribute, scheduleMessage, businessHoursWithin };
}

/** when the message could first be sent: preparation plus typing, as the audit computes it */
export const readyAt = (row: Scheduled) => row.preparedFrom + seconds(row.typingDuration);

export function audit(rows: Scheduled[], start: number, end: number, s: Settings): Violation[] {
  const violations: Violation[] = [];
  let previous: number | null = null;
  rows.forEach((row, index) => {
    const add = (code: ViolationCode) => violations.push({ index, code });
    if (!(start <= row.sendTime && row.sendTime <= end)) add('outside_campaign');
    const clock = timeOfDay(row.sendTime);
    if (!(s.businessStart * HOUR <= clock && clock <= s.businessEnd * HOUR)) add('outside_business_hours');
    if (previous !== null && row.sendTime < previous) add('out_of_order');
    if (row.sendTime < readyAt(row)) add('before_preparation');
    const lower = row.sendTime - seconds(s.burstWindowSeconds);
    const inWindow = rows.slice(0, index + 1).filter((r) => lower < r.sendTime && r.sendTime <= row.sendTime).length;
    if (inWindow > s.maxBurst) add('burst_window');
    previous = row.sendTime;
  });
  return violations;
}

/** the message text the replay authors: six words each */
export const replayContent = (i: number) => `Synthetic event ${i}: inspect fixture queue`;

export function runReplay(raw: Replay, settings: Settings = SOURCE_SETTINGS): ReplayResult {
  const { seed, count, durationHours, startHour } = replaySchema.parse(raw);
  const rng = randomState(seed);
  const engine = scheduler(rng, settings);
  const start = REPLAY_DAY + startHour * HOUR;
  const end = start + seconds(durationHours * 3600);
  const distribution = engine.distribute(count, durationHours);
  const schedule: Scheduled[] = [];
  let current = start;
  for (let i = 0; i < count; i++) {
    const row = engine.scheduleMessage(i, replayContent(i), schedule, current);
    if (i < distribution.length) {
      let planned = start + seconds(distribution[i]);
      if (planned > end) planned = end;
      if (planned > row.sendTime) {
        row.sendTime = planned;
        row.distributionAdjusted = true;
      }
    }
    row.sendTime = engine.businessHoursWithin(row.sendTime, start, end);
    schedule.push(row);
    current = row.sendTime;
  }
  const rows = [...schedule].sort((a, b) => a.sendTime - b.sendTime);
  const intervals = rows.slice(1).map((r, i) => totalSeconds(r.sendTime - rows[i].sendTime));
  const mean = intervals.length ? npMean(intervals) : 0;
  const std = intervals.length ? Math.sqrt(npVar(intervals)) : 0;
  return {
    start,
    end,
    schedule: rows,
    distribution,
    violations: audit(rows, start, end, settings),
    stats: {
      count: rows.length,
      pauseCount: rows.filter((r) => r.pause > 0).length,
      spanSeconds: totalSeconds(rows[rows.length - 1].sendTime - rows[0].sendTime),
      meanIntervalSeconds: mean,
      intervalCv: mean ? std / mean : 0,
      meanWpm: npMean(rows.map((r) => r.wpm)),
    },
  };
}

/** a send time as the replay prints it: 2030-01-07T09:01:54.554599+00:00 */
export function isoMicros(us: number): string {
  const ms = Math.floor(us / 1000);
  const micros = us - ms * 1000;
  const base = new Date(ms).toISOString().slice(0, 19);
  const frac = String((ms % 1000) * 1000 + micros).padStart(6, '0');
  return `${base}${frac === '000000' ? '' : `.${frac}`}+00:00`;
}
