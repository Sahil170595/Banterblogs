import { missionSchema, type Mission, type Waypoint } from './contract';

// ProjectWyvern's mission lifecycle (src/wyvern at the linked commit), ported:
// the state graph (state_machine.py), the pre-flight validator
// (services/validation.py), the runtime safety guard (services/safety_guard.py)
// and the executor's monitor loop (services/executor.py) over its mock
// vehicle (vehicle/mock_adapter.py), which reaches one waypoint per poll.
// Time is a virtual clock in milliseconds; the executor polls every 100.

export const POLL_MS = 100;

export const TRANSITIONS = {
  draft: ['validated'],
  validated: ['awaiting_approval', 'rejected'],
  awaiting_approval: ['approved', 'rejected'],
  approved: ['staging', 'expired'],
  staging: ['executing', 'failed'],
  executing: ['paused', 'rtl', 'aborted', 'completed', 'failed', 'manual_handover'],
  paused: ['resuming', 'rtl', 'aborted', 'manual_handover'],
  resuming: ['executing'],
  rtl: ['completed', 'failed'],
  manual_handover: ['paused'],
  aborted: [],
  completed: [],
  failed: [],
  rejected: [],
  expired: [],
} as const;
export type State = keyof typeof TRANSITIONS;
export const canTransition = (from: State, to: State) => (TRANSITIONS[from] as readonly State[]).includes(to);

// the safety guard's thresholds, as the source writes them
const MIN_LINK_QUALITY = 0.3;
const GOOD_ESTIMATOR = ['nominal', 'good', 'ok'];

export interface Telemetry {
  battery: number;
  link: number;
  estimator: string;
  /** when the cached telemetry was taken, on the virtual clock */
  takenAt: number;
}

/** the healthy telemetry the source's tests seed */
export const HEALTHY: Omit<Telemetry, 'takenAt'> = { battery: 90, link: 0.95, estimator: 'nominal' };

export type Fault = 'healthy' | 'battery' | 'link' | 'estimator' | 'stale' | 'missing';
export const FAULTS: Fault[] = ['healthy', 'battery', 'link', 'estimator', 'stale', 'missing'];

/** what a fault does to the cached telemetry at the moment it starts */
export function faulted(fault: Fault, mission: Mission, now: number): Telemetry | null {
  const fresh = { ...HEALTHY, takenAt: now };
  switch (fault) {
    case 'healthy':
      return fresh;
    case 'battery':
      return { ...fresh, battery: mission.constraints.min_battery_percent - 1 };
    case 'link':
      return { ...fresh, link: 0.2 };
    case 'estimator':
      return { ...fresh, estimator: 'fault' };
    case 'stale':
      // the collector stopped a second past the freshness limit ago
      return { ...fresh, takenAt: now - mission.constraints.telemetry_freshness_ms - 1000 };
    case 'missing':
      return null;
  }
}

/** the source's ray cast; the fence is [lon, lat] pairs */
export function pointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export type CheckStatus = 'passed' | 'failed' | 'warning';
export interface Check {
  name: string;
  status: CheckStatus;
  reason: string | null;
}

export function validate(mission: Mission, telemetry: Telemetry | null, now: number): { passed: boolean; checks: Check[] } {
  const checks: Check[] = [];
  const outside = mission.waypoints.find((w) => !pointInPolygon(w.lat, w.lon, mission.geofence));
  checks.push({ name: 'geofence_containment', status: outside ? 'failed' : 'passed', reason: outside ? `waypoint_seq_${outside.seq}_outside_geofence` : null });
  const over = mission.waypoints.find((w) => w.alt_m > mission.constraints.max_altitude_m);
  checks.push({
    name: 'altitude_limit',
    status: over ? 'failed' : 'passed',
    reason: over ? `waypoint_seq_${over.seq}_exceeds_${mission.constraints.max_altitude_m}m` : null,
  });
  if (telemetry === null) {
    checks.push({ name: 'battery_threshold', status: 'warning', reason: 'no_telemetry_available' });
    checks.push({ name: 'telemetry_freshness', status: 'warning', reason: 'no_telemetry_available' });
  } else {
    const low = telemetry.battery < mission.constraints.min_battery_percent;
    checks.push({
      name: 'battery_threshold',
      status: low ? 'failed' : 'passed',
      reason: low ? `battery_${telemetry.battery.toFixed(0)}_below_${mission.constraints.min_battery_percent.toFixed(0)}` : null,
    });
    const age = now - telemetry.takenAt;
    const stale = age > mission.constraints.telemetry_freshness_ms;
    checks.push({
      name: 'telemetry_freshness',
      status: stale ? 'failed' : 'passed',
      reason: stale ? `telemetry_age_${age}ms_exceeds_${mission.constraints.telemetry_freshness_ms}ms` : null,
    });
  }
  const { regulatory } = mission;
  if (regulatory.remote_id_required) {
    const active = regulatory.remote_id_status === 'active';
    checks.push({ name: 'remote_id_compliance', status: active ? 'passed' : 'failed', reason: active ? null : `remote_id_${regulatory.remote_id_status}` });
  }
  if (regulatory.operation_type === 'part107' || regulatory.operation_type === 'part107_waiver') {
    const ref = regulatory.airspace_authorization_ref;
    checks.push({ name: 'airspace_authorization', status: ref ? 'passed' : 'warning', reason: ref ? null : 'no_airspace_auth_ref' });
  }
  return { passed: checks.every((c) => c.status !== 'failed'), checks };
}

/** the guard's first violation, as a reason code, or null */
export function safetyCheck(mission: Mission, telemetry: Telemetry | null, stagedAt: number, now: number): string | null {
  if (telemetry === null) return 'blocked.no_telemetry';
  if (telemetry.battery < mission.constraints.min_battery_percent) return 'degraded.battery_low';
  if (telemetry.link < MIN_LINK_QUALITY) return 'degraded.link_quality';
  if (!GOOD_ESTIMATOR.includes(telemetry.estimator)) return 'degraded.estimator';
  if (now - telemetry.takenAt > mission.constraints.telemetry_freshness_ms) return 'blocked.telemetry_stale';
  if ((now - stagedAt) / 1000 > mission.constraints.mission_timeout_s) return 'timeout.mission';
  return null;
}

export interface FlightEvent {
  at: number;
  kind: 'transition' | 'poll' | 'logged';
  state: State;
  actor: string;
  reason: string;
  /** waypoints reached when it happened */
  progress: number;
}

export interface Scenario {
  fault: Fault;
  /**
   * the fault is there at validation, begins after `afterPolls` polls in
   * flight, or begins once an operator has paused after `afterPolls` polls and
   * resumed
   */
  when: 'validation' | 'flight' | 'resumed';
  afterPolls: number;
  /** the vehicle stops advancing, so only the mission timeout can end the flight */
  stall: boolean;
}

export const DEFAULT_SCENARIO: Scenario = { fault: 'missing', when: 'validation', afterPolls: 2, stall: false };

export interface Flight {
  validation: { passed: boolean; checks: Check[] };
  /** whether the flow went on to fly: a failed validation stops before approval */
  flown: boolean;
  events: FlightEvent[];
  state: State;
  progress: number;
  reason: string;
  /** reason codes the guard raised and the executor only logged */
  logged: string[];
  /** still executing with no monitor loop: nothing polls, guards or completes it */
  unwatched: boolean;
}

/** a cap on polls, well past the longest timeout a scenario here can reach */
const MAX_POLLS = 100_000;

/**
 * Validate, then fly the mission as the executor would, under the scenario.
 * With `flyAnyway`, the executor runs even after a failed validation, as the
 * source's own tests drive it straight to staging.
 */
export function fly(rawMission: Mission, scenario: Scenario, flyAnyway = false): Flight {
  const mission = missionSchema.parse(rawMission);
  let now = 0;
  let telemetry = scenario.when === 'validation' ? faulted(scenario.fault, mission, now) : faulted('healthy', mission, now);
  // a working collector keeps refreshing the cache; a stopped or absent one does not
  let collecting = !(scenario.when === 'validation' && (scenario.fault === 'stale' || scenario.fault === 'missing'));
  const validation = validate(mission, telemetry, now);
  const events: FlightEvent[] = [];
  const logged: string[] = [];
  let state: State = 'draft';
  let progress = 0;
  const go = (next: State, actor: string, reason: string) => {
    if (!canTransition(state, next)) throw new Error(`Cannot transition ${state} to ${next}.`);
    state = next;
    events.push({ at: now, kind: 'transition', state, actor, reason, progress });
  };
  if (!validation.passed && !flyAnyway) return { validation, flown: false, events, state, progress, reason: 'validation.failed', logged, unwatched: false };
  // the routes' own actors and reason codes (routes/missions.py)
  go('validated', 'wyvern_validator', 'mission.validated');
  go('awaiting_approval', 'wyvern_validator', 'mission.awaiting_approval');
  go('approved', 'operator:chimera', 'mission.approved');
  go('staging', 'wyvern_executor', 'mission.staging');
  const stagedAt = now;
  go('executing', 'wyvern_executor', 'mission.executing');
  const total = mission.waypoints.length;
  let reason = 'mission.executing';
  for (let poll = 1; poll <= MAX_POLLS; poll++) {
    if (scenario.when === 'resumed' && poll === scenario.afterPolls + 1) {
      // the pause route; the executor's loop sees a paused mission and yields
      go('paused', 'operator', 'operator.pause');
      // the resume route restarts the vehicle and returns to executing, but
      // nothing restarts the executor, so no loop polls or guards after this
      go('resuming', 'operator', 'operator.resume');
      go('executing', 'wyvern_executor', 'mission.resumed');
      telemetry = faulted(scenario.fault, mission, now);
      return { validation, flown: true, events, state, progress, reason: 'mission.resumed', logged, unwatched: true };
    }
    if (scenario.when === 'flight' && poll === scenario.afterPolls + 1) {
      telemetry = faulted(scenario.fault, mission, now);
      if (scenario.fault === 'stale' || scenario.fault === 'missing') collecting = false;
    } else if (collecting && telemetry !== null) {
      telemetry = { ...telemetry, takenAt: now };
    }
    if (!scenario.stall && progress < total) progress++;
    events.push({ at: now, kind: 'poll', state, actor: 'mock_adapter', reason: `waypoint ${progress} of ${total}`, progress });
    if (progress >= total) {
      go('completed', 'wyvern_executor', 'mission.completed');
      reason = 'mission.completed';
      break;
    }
    const violation = safetyCheck(mission, telemetry, stagedAt, now);
    if (violation && (violation.startsWith('degraded.') || violation.startsWith('timeout.'))) {
      go('rtl', 'safety_guard', violation);
      reason = violation;
      break;
    }
    if (violation) {
      if (!logged.includes(violation)) logged.push(violation);
      events.push({ at: now, kind: 'logged', state, actor: 'safety_guard', reason: violation, progress });
    }
    now += POLL_MS;
  }
  return { validation, flown: true, events, state, progress, reason, logged, unwatched: false };
}

export interface Leg {
  from: Waypoint;
  to: Waypoint;
  /** the first sampled point of the leg outside the fence */
  exit: { lat: number; lon: number };
}

/** legs that leave the fence between two waypoints inside it: a check the validator does not make */
export function legsLeavingFence(mission: Mission, samples = 50): Leg[] {
  const out: Leg[] = [];
  for (let i = 1; i < mission.waypoints.length; i++) {
    const from = mission.waypoints[i - 1];
    const to = mission.waypoints[i];
    for (let s = 1; s < samples; s++) {
      const t = s / samples;
      const lat = from.lat + (to.lat - from.lat) * t;
      const lon = from.lon + (to.lon - from.lon) * t;
      if (!pointInPolygon(lat, lon, mission.geofence)) {
        out.push({ from, to, exit: { lat, lon } });
        break;
      }
    }
  }
  return out;
}
