import { LONG_MISSION, SAMPLE_MISSION } from './contract';
import { fly, type Fault, type Flight, type State } from './engine';
import SOURCE_RUNS from './source-runs.json';

// ProjectWyvern itself, run in Python at the linked commit on its own sample
// mission: its ValidationService, then its MissionExecutor with its
// SafetyGuard and MockVehicleAdapter, driven straight to staging as its own
// tests do. Recorded per fault, present at validation or starting after the
// second poll of a six-waypoint flight, and once through a pause and resume.

export interface AtValidation {
  fault: Fault;
  count: number;
  timeoutSeconds: number;
  checks: [string, string, string | null][];
  state: State;
  progress: number;
  reason: string;
}
export interface InFlight {
  fault: Fault;
  count: number;
  afterPolls: number;
  state: State;
  progress: number;
  reason: string;
}
export interface Resumed extends InFlight {
  timeline: [string, string, string][];
}
export const RUNS = SOURCE_RUNS as unknown as { atValidation: AtValidation[]; inFlight: InFlight[]; resumed: Resumed };

/** transitions before the source's recorded timeline starts: validated, awaiting approval, approved, staging */
const BEFORE_STAGING = 4;
// a 1-second timeout marks the stalled run, which only the timeout can end
const STALL_TIMEOUT_S = 1;

export const isStalled = (run: AtValidation) => run.timeoutSeconds === STALL_TIMEOUT_S;

export function flyAtValidation(run: AtValidation): Flight {
  const mission = {
    ...SAMPLE_MISSION,
    waypoints: SAMPLE_MISSION.waypoints.slice(0, run.count),
    constraints: { ...SAMPLE_MISSION.constraints, mission_timeout_s: run.timeoutSeconds },
  };
  return fly(mission, { fault: run.fault, when: 'validation', afterPolls: 0, stall: isStalled(run) }, true);
}

export const flyInFlight = (run: InFlight) => fly(LONG_MISSION, { fault: run.fault, when: 'flight', afterPolls: run.afterPolls, stall: false });
export const flyResumed = (run: Resumed) => fly(LONG_MISSION, { fault: run.fault, when: 'resumed', afterPolls: run.afterPolls, stall: false });
export const afterStaging = (flight: Flight) => flight.events.filter((e) => e.kind === 'transition').slice(BEFORE_STAGING);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const ending = (flight: Flight) => [flight.state, flight.progress, flight.reason];

export function matchesAtValidation(run: AtValidation): boolean {
  const flight = flyAtValidation(run);
  return (
    same(
      flight.validation.checks.map((c) => [c.name, c.status]),
      run.checks.map(([name, status]) => [name, status]),
    ) &&
    // the stale reason carries a wall-clock age in the source; the rest are exact
    run.checks.every(([, , reason], i) => reason?.startsWith('telemetry_age_') || flight.validation.checks[i].reason === reason) &&
    same(ending(flight), [run.state, run.progress, run.reason])
  );
}

export function matchesInFlight(run: InFlight): boolean {
  const flight = flyInFlight(run);
  return flight.validation.passed && same(ending(flight), [run.state, run.progress, run.reason]);
}

export function matchesResumed(run: Resumed): boolean {
  const flight = flyResumed(run);
  return (
    same(ending(flight), [run.state, run.progress, run.reason]) &&
    flight.unwatched &&
    same(
      afterStaging(flight).map((e) => [e.state, e.actor, e.reason]),
      run.timeline.slice(1),
    )
  );
}

/** how many of the recorded runs the port reproduces */
export function reproducedRuns(): { matched: number; total: number } {
  const results = [...RUNS.atValidation.map(matchesAtValidation), ...RUNS.inFlight.map(matchesInFlight), matchesResumed(RUNS.resumed)];
  return { matched: results.filter(Boolean).length, total: results.length };
}
