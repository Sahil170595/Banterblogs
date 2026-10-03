import { describe, expect, it } from 'vitest';
import { LONG_MISSION, SAMPLE_MISSION } from './contract';
import { canTransition, fly, legsLeavingFence, TRANSITIONS, type Fault, type State } from './engine';
import SOURCE_RUNS from './source-runs.json';

// ProjectWyvern itself, run in Python at the linked commit on its own sample
// mission: its ValidationService, then its MissionExecutor with its
// SafetyGuard and MockVehicleAdapter, driven straight to staging as its own
// tests do. Recorded per fault, present at validation or starting after the
// second poll of a six-waypoint flight.

interface AtValidation {
  fault: Fault;
  count: number;
  timeoutSeconds: number;
  checks: [string, string, string | null][];
  state: State;
  progress: number;
  reason: string;
}
interface InFlight {
  fault: Fault;
  count: number;
  afterPolls: number;
  state: State;
  progress: number;
  reason: string;
}
interface Resumed extends InFlight {
  timeline: [string, string, string][];
}
const RUNS = SOURCE_RUNS as unknown as { atValidation: AtValidation[]; inFlight: InFlight[]; resumed: Resumed };

describe('the ported lifecycle against the source in Python', () => {
  for (const run of RUNS.atValidation) {
    const stall = run.timeoutSeconds === 1;
    const label = `${run.fault} at validation, ${run.count} waypoints${stall ? ', stalled, 1 s timeout' : ''}`;
    it(`matches ${label}`, () => {
      const mission = {
        ...SAMPLE_MISSION,
        waypoints: SAMPLE_MISSION.waypoints.slice(0, run.count),
        constraints: { ...SAMPLE_MISSION.constraints, mission_timeout_s: run.timeoutSeconds },
      };
      const flight = fly(mission, { fault: run.fault, when: 'validation', afterPolls: 0, stall }, true);
      expect(flight.validation.checks.map((c) => [c.name, c.status])).toEqual(run.checks.map(([name, status]) => [name, status]));
      // the stale reason carries a wall-clock age in the source; the rest are exact
      for (const [i, [, , reason]] of run.checks.entries()) if (!reason?.startsWith('telemetry_age_')) expect(flight.validation.checks[i].reason).toBe(reason);
      expect([flight.state, flight.progress, flight.reason]).toEqual([run.state, run.progress, run.reason]);
    });
  }

  for (const run of RUNS.inFlight) {
    it(`matches ${run.fault} starting after poll ${run.afterPolls} of ${run.count}`, () => {
      const flight = fly(LONG_MISSION, { fault: run.fault, when: 'flight', afterPolls: run.afterPolls, stall: false });
      expect(flight.validation.passed).toBe(true);
      expect([flight.state, flight.progress, flight.reason]).toEqual([run.state, run.progress, run.reason]);
    });
  }

  it('matches a pause and resume after which the battery fails: still executing, nothing watching', () => {
    const run = RUNS.resumed;
    const flight = fly(LONG_MISSION, { fault: run.fault, when: 'resumed', afterPolls: run.afterPolls, stall: false });
    expect([flight.state, flight.progress, flight.reason]).toEqual([run.state, run.progress, run.reason]);
    expect(flight.unwatched).toBe(true);
    // the source's timeline after staging, transition for transition
    const after = flight.events.filter((e) => e.kind === 'transition').slice(4);
    expect(after.map((e) => [e.state, e.actor, e.reason])).toEqual(run.timeline.slice(1));
  });

  it('carries the state graph, every legal and forbidden pair', () => {
    const states = Object.keys(TRANSITIONS) as State[];
    expect(states).toHaveLength(15);
    expect(canTransition('executing', 'rtl')).toBe(true);
    expect(canTransition('completed', 'executing')).toBe(false);
    expect(states.filter((s) => TRANSITIONS[s].length === 0).sort()).toEqual(['aborted', 'completed', 'expired', 'failed', 'rejected']);
  });
});

describe('what the lifecycle leaves open', () => {
  it('flies every waypoint with no telemetry at all, after passing validation with two warnings', () => {
    const flight = fly(SAMPLE_MISSION, { fault: 'missing', when: 'validation', afterPolls: 0, stall: false });
    expect(flight.validation.passed).toBe(true);
    expect(flight.validation.checks.filter((c) => c.status === 'warning').map((c) => c.name)).toEqual(['battery_threshold', 'telemetry_freshness']);
    expect([flight.state, flight.progress]).toEqual(['completed', 3]);
    expect(flight.logged).toEqual(['blocked.no_telemetry']);
    // the mission said what to do on link loss
    expect(SAMPLE_MISSION.constraints.link_loss_policy).toBe('rtl');
  });

  it('stops a failed validation before approval unless driven past it', () => {
    const flight = fly(SAMPLE_MISSION, { fault: 'stale', when: 'validation', afterPolls: 0, stall: false });
    expect(flight.flown).toBe(false);
    expect(flight.state).toBe('draft');
  });

  it('finds a leg that leaves a concave fence between two waypoints inside it', () => {
    const notched = {
      ...SAMPLE_MISSION,
      // a U: the notch between lon -71.102 and -71.098 is outside, above lat 42.295
      geofence: [
        [-71.11, 42.29],
        [-71.09, 42.29],
        [-71.09, 42.31],
        [-71.098, 42.31],
        [-71.098, 42.295],
        [-71.102, 42.295],
        [-71.102, 42.31],
        [-71.11, 42.31],
      ] as [number, number][],
      waypoints: [
        { seq: 1, lat: 42.305, lon: -71.106, alt_m: 22 },
        { seq: 2, lat: 42.305, lon: -71.094, alt_m: 22 },
      ],
    };
    const flight = fly(notched, { fault: 'healthy', when: 'validation', afterPolls: 0, stall: false });
    expect(flight.validation.checks[0]).toMatchObject({ name: 'geofence_containment', status: 'passed' });
    expect(legsLeavingFence(notched)).toHaveLength(1);
    expect(legsLeavingFence(SAMPLE_MISSION)).toHaveLength(0);
  });
});
