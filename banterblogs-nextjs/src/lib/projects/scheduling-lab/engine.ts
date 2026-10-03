import { makeSession } from './fixtures';
import { randomStream } from './random';
import { DAY_MS, HOUR_MS, MINUTE_MS, MAX_TRACE_BYTES, sessionSchema, type Config, type Preset, type Result, type ScheduledEvent, type Session, type Violation } from './types';

const MIN_WPM = 30, MAX_WPM = 80;
const PAUSE_MEAN_SECONDS = 12, PAUSE_MIN_MS = 5000, PAUSE_MAX_MS = 45000;
const CLUSTER_STD_MS = 180_000, CLUSTER_LOOKAHEAD_MS = 300_000;
const MIN_INTERVAL_VARIANCE = 100, REPEAT_TOLERANCE_MS = 5000;
const PEAK_SHARE = 0.3;
const MIN_HISTORY_FOR_JITTER = 3;
const VARIANCE_DELAY_SCALE_SECONDS = 30;
const BURST_DELAY_MIN_SECONDS = 30, BURST_DELAY_MAX_SECONDS = 60;
const CLUSTER_PEAK_HOURS = [10, 11, 14, 15], DISTRIBUTION_PEAK_HOURS = [10, 14];
const QUARTER_MINUTES = [0, 15, 30, 45];
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const dayStart = (time: number) => Math.floor(time / DAY_MS) * DAY_MS;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const variance = (values: number[]) => mean(values.map(v => (v - mean(values)) ** 2));

export function freshSession(preset: Preset = 'baseline'): Session { return makeSession(preset); }
export function businessWindows(config: Config): { start: number; end: number }[] {
  const start = Date.parse(config.start), end = start + config.durationMinutes * MINUTE_MS;
  const windows: { start: number; end: number }[] = [];
  for (let day = dayStart(start); day <= end; day += DAY_MS) {
    const open = Math.max(start, day + config.businessStart * HOUR_MS);
    const close = Math.min(end, day + config.businessEnd * HOUR_MS);
    if (open < close) windows.push({ start: open, end: close });
  }
  return windows;
}
function withinBusiness(time: number, config: Config) {
  const clock = time - dayStart(time);
  return clock >= config.businessStart * HOUR_MS && clock < config.businessEnd * HOUR_MS;
}
function nextOpen(time: number, config: Config, sourceInclusiveClose = false) {
  const day = dayStart(time), opening = day + config.businessStart * HOUR_MS, closing = day + config.businessEnd * HOUR_MS;
  if (time < opening) return opening;
  if (time > closing || (!sourceInclusiveClose && time === closing)) return opening + DAY_MS;
  return time;
}
function boundedClamp(time: number, start: number, end: number, config: Config) {
  let target = clamp(time, start, end);
  const day = dayStart(target), opening = day + config.businessStart * HOUR_MS, closing = day + config.businessEnd * HOUR_MS;
  if (target < opening && opening >= start && opening <= end) target = opening;
  if (target > closing && closing >= start && closing <= end) target = closing;
  return target;
}
function nextCluster(time: number): number | null {
  const day = dayStart(time), hour = Math.floor((time - day) / HOUR_MS), minute = Math.floor((time % HOUR_MS) / MINUTE_MS);
  if (CLUSTER_PEAK_HOURS.includes(hour)) {
    const quarter = QUARTER_MINUTES.find(value => value > minute);
    if (quarter !== undefined) return day + hour * HOUR_MS + quarter * MINUTE_MS;
  }
  return CLUSTER_PEAK_HOURS.includes(hour + 1) ? day + (hour + 1) * HOUR_MS : null;
}
function distributionPlan(config: Config, count: number, random: ReturnType<typeof randomStream>) {
  const start = Date.parse(config.start), end = start + config.durationMinutes * MINUTE_MS;
  const uniform = () => Math.round(start + random.uniform() * (end - start));
  const peakWindows: { start: number; end: number }[] = [];
  const anchors: number[] = [];
  for (let day = dayStart(start); day <= end; day += DAY_MS) {
    for (const hour of DISTRIBUTION_PEAK_HOURS) {
      const low = Math.max(start, day + hour * HOUR_MS), high = Math.min(end, day + (hour + 1) * HOUR_MS);
      if (low < high) peakWindows.push({ start: low, end: high });
    }
    for (let hour = config.businessStart; hour < config.businessEnd; hour++) for (const minute of QUARTER_MINUTES) {
      const at = day + hour * HOUR_MS + minute * MINUTE_MS;
      if (at >= start && at <= end) anchors.push(at);
    }
  }
  const peaks = config.distribution === 'mixed' ? Math.floor(count * PEAK_SHARE) : 0;
  const clusters = config.distribution === 'mixed' ? Math.floor(count * config.clusterShare) : 0;
  const plan = Array.from({ length: count }, (_, index) => {
    if (index < peaks && peakWindows.length) {
      const window = peakWindows[Math.floor(random.uniform() * peakWindows.length)];
      return Math.round(window.start + random.uniform() * (window.end - window.start));
    }
    if (index >= peaks && index < peaks + clusters && anchors.length) {
      const anchor = anchors[Math.floor(random.uniform() * anchors.length)];
      return Math.round(clamp(anchor + random.normal() * CLUSTER_STD_MS, start, end));
    }
    return uniform();
  });
  return plan.sort((a, b) => a - b);
}

function audit(events: ScheduledEvent[], config: Config, start: number, end: number): Violation[] {
  const violations: Violation[] = [];
  const admitted = events.filter(e => e.scheduledAt !== null);
  let previous = start;
  for (const event of admitted) {
    const at = event.scheduledAt!;
    const add = (code: Violation['code'], detail: string) => violations.push({ eventId: event.id, code, detail });
    if (at < start || at > end) add('bounds', 'Scheduled timestamp lies outside the campaign horizon.');
    if (at < event.preparedAt) add('preparation', `Scheduled ${((event.preparedAt - at) / 1000).toFixed(3)} seconds before preparation completes.`);
    if (at < previous) add('order', 'Timestamp moves backward relative to the preceding event.');
    if (!withinBusiness(at, config)) add('business-hours', 'Timestamp is outside the half-open UTC business window.');
    const count = admitted.filter(other => other.scheduledAt! > at - config.burstWindowSeconds * 1000 && other.scheduledAt! <= at).length;
    if (count > config.burstLimit) add('burst', `${count} events share a ${config.burstWindowSeconds}-second trailing window; limit ${config.burstLimit}.`);
    previous = at;
  }
  return violations;
}

export function analyze(input: Session): Result {
  const session = sessionSchema.parse(input), config = session.config;
  if (new Set(session.events.map(e => e.id)).size !== session.events.length) throw new Error('Duplicate event IDs.');
  const start = Date.parse(config.start), end = start + config.durationMinutes * MINUTE_MS;
  const random = randomStream(config.seed), plan = distributionPlan(config, session.events.length, random);
  const events: ScheduledEvent[] = [];
  let clock = start;
  for (const [index, message] of session.events.entries()) {
    const wordCount = message.text.trim().split(/\s+/).length;
    const sampledWpm = clamp(config.wpmMean + random.normal() * config.wpmStd, MIN_WPM, MAX_WPM);
    const typingMs = Math.round(wordCount / sampledWpm * MINUTE_MS);
    const pauseMs = random.uniform() < config.pauseProbability ? Math.round(clamp(random.exponential(PAUSE_MEAN_SECONDS) * 1000, PAUSE_MIN_MS, PAUSE_MAX_MS)) : 0;
    const preparedAt = clock + typingMs + pauseMs;
    const candidateAnchor = nextCluster(clock);
    const anchorAt = candidateAnchor !== null && candidateAnchor - clock < typingMs + pauseMs + CLUSTER_LOOKAHEAD_MS && candidateAnchor >= preparedAt ? candidateAnchor : null;
    const clusterProposal = anchorAt === null ? preparedAt : Math.min(preparedAt + Math.round(random.normal() * CLUSTER_STD_MS), anchorAt);
    let proposed = clusterProposal, intervalJitterMs = 0, burstDelayMs = 0;
    const history = events.filter(e => e.scheduledAt !== null).map(e => e.scheduledAt!);
    if (history.length >= MIN_HISTORY_FOR_JITTER) {
      const intervals = history.slice(1).map((at, i) => at - history[i]);
      if (variance(intervals.map(ms => ms / 1000)) < MIN_INTERVAL_VARIANCE) intervalJitterMs += Math.round((random.exponential(VARIANCE_DELAY_SCALE_SECONDS) + random.exponential(VARIANCE_DELAY_SCALE_SECONDS)) * 1000);
      if (intervals.some(ms => Math.abs(proposed + intervalJitterMs - history[history.length - 1] - ms) < REPEAT_TOLERANCE_MS)) intervalJitterMs += Math.round(random.normal() * config.jitterStd * 1000);
      proposed += intervalJitterMs;
      if (history.slice(-config.burstLimit).filter(at => at > proposed - config.burstWindowSeconds * 1000).length >= config.burstLimit) burstDelayMs = Math.round((BURST_DELAY_MIN_SECONDS + random.uniform() * (BURST_DELAY_MAX_SECONDS - BURST_DELAY_MIN_SECONDS)) * 1000);
    }
    proposed += burstDelayMs;
    let scheduledAt: number | null, deferral: string | null = null;
    const stages = [{ name: 'Preparation complete', at: preparedAt }, { name: 'Cluster proposal', at: clusterProposal }, { name: 'Interval jitter + delay', at: proposed }, { name: 'Distribution slot', at: plan[index] }];
    if (config.boundsPolicy === 'clamp-audit') {
      const open = nextOpen(proposed, config, true);
      const distributed = Math.max(open, plan[index]);
      scheduledAt = boundedClamp(distributed, start, end, config);
      stages.push({ name: 'Forward opening adjustment', at: open }, { name: 'Combined distribution', at: distributed }, { name: 'Bounded clamp (audit)', at: scheduledAt });
    } else {
      let candidate = nextOpen(Math.max(preparedAt, proposed, plan[index]), config);
      if (history.length >= config.burstLimit) candidate = nextOpen(Math.max(candidate, history[history.length - config.burstLimit] + config.burstWindowSeconds * 1000), config);
      stages.push({ name: 'Forward feasible candidate', at: candidate });
      scheduledAt = candidate <= end ? candidate : null;
      if (scheduledAt === null) deferral = 'No forward-feasible slot within the campaign and business-hour bounds.';
    }
    events.push({ ...message, wordCount, sampledWpm, previousAt: clock, typingMs, pauseMs, preparedAt, anchorAt, plannedAt: plan[index], proposalAt: proposed,
      clusterShiftMs: clusterProposal - preparedAt, intervalJitterMs, burstDelayMs, scheduledAt, deferral, stages });
    clock = scheduledAt ?? preparedAt;
  }
  const admitted = events.filter(e => e.scheduledAt !== null).sort((a, b) => a.scheduledAt! - b.scheduledAt! || a.id.localeCompare(b.id));
  if (session.processed > admitted.length) throw new Error('Simulation cursor exceeds admitted events; reset it after input edits.');
  const gaps = admitted.slice(1).map((e, i) => (e.scheduledAt! - admitted[i].scheduledAt!) / 1000);
  const average = gaps.length ? mean(gaps) : null;
  const violations = audit(events, config, start, end);
  return { start, end, events, violations,
    metrics: { admitted: admitted.length, deferred: events.length - admitted.length, pauseCount: events.filter(e => e.pauseMs > 0).length, meanGapSeconds: average,
      gapCv: average !== null && average > 0 ? Math.sqrt(variance(gaps)) / average : null, violationCount: violations.length,
      businessAdherence: admitted.length ? admitted.filter(e => withinBusiness(e.scheduledAt!, config)).length / admitted.length : null },
    simulation: { delivery: 'simulated-only', processedIds: admitted.slice(0, session.processed).map(e => e.id), clock: session.processed ? admitted[session.processed - 1].scheduledAt! : start },
  };
}

export function advance(input: Session): Session {
  const session = sessionSchema.parse(input), result = analyze(session);
  return { ...session, processed: Math.min(result.metrics.admitted, session.processed + 1) };
}
export function exportTrace(input: Session) {
  const session = sessionSchema.parse(input);
  return { version: 'scheduling-lab/v1', randomAlgorithm: 'Mulberry32 + Box-Muller + inverse-exponential; local seed, not NumPy-compatible', fidelity: 'Synthetic workload scheduling. Delivery simulated only. No provider or agent control.', session, result: analyze(session) };
}
export function replayTrace(text: string): Session {
  if (new TextEncoder().encode(text).length > MAX_TRACE_BYTES) throw new Error('Trace exceeds the 250 KB limit.');
  const trace: unknown = JSON.parse(text);
  if (!trace || typeof trace !== 'object' || !('version' in trace) || trace.version !== 'scheduling-lab/v1' || !('session' in trace)) throw new Error('Use a scheduling-lab/v1 versioned trace.');
  const session = sessionSchema.parse(trace.session);
  analyze(session);
  return session;
}
