'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, Minus, TriangleAlert } from 'lucide-react';
import { LONG_MISSION, SAMPLE_MISSION, type Mission } from '@/lib/projects/mission-governance/contract';
import { fly, type Fault, type Flight, type Scenario } from '@/lib/projects/mission-governance/engine';
import { faultMatrix, flewBlind, MID_FLIGHT_AFTER } from '@/lib/projects/mission-governance/matrix';
import { controls, Segmented, UnderTheHood } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import { revealResult } from '../reveal';
import { FlightMap } from './FlightMap';
import { checkReason, guardWords, outcome } from './words';
import styles from './mission.module.css';

export const FAULT_LABELS: Record<Fault, string> = {
  healthy: 'Healthy telemetry',
  battery: 'Battery below the floor',
  link: 'Weak link',
  estimator: 'Estimator fault',
  stale: 'Stale telemetry',
  missing: 'No telemetry',
};

// how each fault reads when it starts mid-flight
const MID_FLIGHT_WORDS: Record<Fault, string> = {
  healthy: 'nothing changes',
  battery: 'the battery drops below the floor',
  link: 'the link weakens',
  estimator: 'the estimator faults',
  stale: 'telemetry goes stale',
  missing: 'telemetry stops',
};
const POLICY_WORDS = { rtl: 'return to launch', hold: 'hold position', land: 'land' } as const;
// faults the pre-flight check has no test for (validation.py checks the fence,
// altitude, battery, telemetry age and regulation, never link or estimator)
const UNTESTED_AT_CHECK: Partial<Record<Fault, string>> = { link: 'the link', estimator: 'the estimator' };
const say = (n: number) => ['no', 'one', 'two', 'three', 'four', 'five', 'six'][n] ?? String(n);

export const MATRIX_COLUMNS = {
  fault: 'Fault',
  atCheck: 'Present at the pre-flight check',
  midFlight: `Starts after waypoint ${MID_FLIGHT_AFTER}`,
} as const;

// a U-shaped fence whose notch the straight leg between two inside waypoints crosses
const NOTCHED: Mission = {
  ...SAMPLE_MISSION,
  mission_id: 'notched_fence',
  geofence: [
    [-71.11, 42.29],
    [-71.09, 42.29],
    [-71.09, 42.31],
    [-71.098, 42.31],
    [-71.098, 42.295],
    [-71.102, 42.295],
    [-71.102, 42.31],
    [-71.11, 42.31],
  ],
  waypoints: [
    { seq: 1, lat: 42.305, lon: -71.106, alt_m: 22 },
    { seq: 2, lat: 42.305, lon: -71.094, alt_m: 22 },
  ],
};
const ROUTES = { sample: LONG_MISSION, notched: NOTCHED } as const;
type Route = keyof typeof ROUTES;
// the notched route ends at its second waypoint, before a fault after it, or
// after a pause there, could begin: only the pre-flight timing applies
const WHEN_OPTIONS: { value: Scenario['when']; label: string }[] = [
  { value: 'validation', label: 'At the pre-flight check' },
  { value: 'flight', label: `After waypoint ${MID_FLIGHT_AFTER}` },
  { value: 'resumed', label: 'After a pause and resume' },
];
const ROUTE_TIMINGS: Record<Route, Scenario['when'][]> = { sample: ['validation', 'flight', 'resumed'], notched: ['validation'] };

/** what the notched route's flight did with the leg that crosses the notch */
function notchWords(flight: Flight): string {
  if (!flight.flown) return 'The check failed first, so the drone never flies the leg across the notch; the marked point is where that leg would leave the fence.';
  if (flight.state === 'rtl' && flight.progress < NOTCHED.waypoints.length)
    return `It turned home at waypoint ${flight.progress}, before the leg across the notch; the marked point is where that leg would leave the fence.`;
  return 'Both waypoints sit inside the fence, so the check passes; the straight leg between them crosses the notch. The marked point is where it leaves.';
}

function verdict(flight: Flight): string {
  if (!flight.validation.passed) return 'failed';
  return flight.validation.checks.some((c) => c.status === 'warning') ? 'passed with warnings' : 'passed';
}

/** what the guard did, in words, after the check's verdict */
function guardLine(flight: Flight, when: Scenario['when'], fault: Fault): string {
  const untested = when === 'validation' && flight.validation.passed ? UNTESTED_AT_CHECK[fault] : undefined;
  const check = untested ? `check does not test ${untested}` : when === 'validation' ? `check ${verdict(flight)}` : 'check passed';
  if (flewBlind(flight)) return `${check} · guard logged ${flight.logged.map((c) => `“${guardWords(c)}”`).join(', ')} and did nothing else`;
  if (flight.state === 'rtl') return `${check} · guard saw ${guardWords(flight.reason)} and sent it home`;
  return check;
}

/** the source's own codes for a cell, for its title */
const codes = (flight: Flight) => [flight.reason, ...flight.logged].join(', ');

/**
 * The mission page's live demo: every telemetry fault, present at the
 * pre-flight check or starting mid-flight, and how the flight ends; then one
 * scenario in full, on a map, with the checks, and the event log under the
 * hood.
 */
export function MissionDemo() {
  const rows = useMemo(() => faultMatrix(), []);
  const [route, setRoute] = useState<Route>('sample');
  const [scenario, setScenario] = useState<Scenario>({ fault: 'missing', when: 'validation', afterPolls: MID_FLIGHT_AFTER, stall: false });
  // the map and the outcome under it, brought into view when a cell is picked
  const mapRef = useRef<HTMLDivElement>(null);
  const mission = ROUTES[route];
  const flight = useMemo(() => fly(mission, scenario), [mission, scenario]);
  const total = LONG_MISSION.waypoints.length;
  // "telemetry goes stale or stops", not "... or telemetry stops"
  const blind = rows
    .filter((r) => flewBlind(r.midFlight))
    .map((r, i, all) => {
      const words = MID_FLIGHT_WORDS[r.fault];
      return i > 0 && MID_FLIGHT_WORDS[all[0].fault].startsWith('telemetry ') ? words.replace(/^telemetry /, '') : words;
    });
  const missing = rows.find((r) => r.fault === 'missing')!;
  const warnings = missing.atCheck.validation.checks.filter((c) => c.status === 'warning').length;
  const pick = (fault: Fault, when: Scenario['when']) => {
    setRoute('sample');
    setScenario({ ...scenario, fault, when });
    revealResult(mapRef.current);
  };
  const logged = flight.events.filter((e) => e.kind === 'logged');
  const shown = flight.events.filter((e) => e.kind === 'transition');
  // the guard's repeated log lines fold into one entry, placed at the first of them
  const entries = [
    ...shown.map((e) => ({ at: e.at, transition: e })),
    ...(logged.length > 0 ? [{ at: logged[0].at, transition: null }] : []),
  ].sort((a, b) => a.at - b.at);
  const chooseRoute = (next: Route) => {
    setRoute(next);
    if (!ROUTE_TIMINGS[next].includes(scenario.when)) setScenario({ ...scenario, when: 'validation' });
  };

  return (
    <div className={styles.demo}>
      <div className={styles.hero}>
        <p className={styles.headline}>
          Every mission must declare what the drone does if its link is lost; the sample mission says{' '}
          {POLICY_WORDS[LONG_MISSION.constraints.link_loss_policy]}. Nothing in the code reads that field. With no telemetry at all, the mission
          passes its pre-flight check with {say(warnings)} warnings and{' '}
          {missing.atCheck.state === 'completed' ? `flies all ${total} waypoints` : outcome(missing.atCheck, total)}; when {blind.join(' or ')}{' '}
          mid-flight, the safety guard logs it and the flight goes on.
        </p>
        <p className={styles.caveat}>
          This is Wyvern&apos;s software layer, not an aircraft: the vehicle here is the original project&apos;s mock, and a real PX4 flight
          controller has its own link-loss failsafe.
        </p>
        <p className={controls.lead}>
          Telemetry is the drone&apos;s live status: battery, link quality, position estimate. Each row is one telemetry fault, either present at the
          pre-flight check or starting after waypoint {MID_FLIGHT_AFTER}. The route is the original&apos;s sample, a triangle of{' '}
          {SAMPLE_MISSION.waypoints.length} waypoints flown twice ({total} in all), so a fault that starts mid-flight still has a flight left to
          change. Pick a cell to fly it on the map below.
        </p>
        <p className={styles.legend}>
          <span data-key="home">home after waypoint N: the guard worked</span>
          <span data-key="stopped">stopped at the pre-flight check: the check worked</span>
          <span data-key="blind">flew the whole route while the guard could not see the drone</span>
        </p>
        <ProjectFigureTransition slug="mission-governance">
          <div className={styles.tableScroll} role="region" aria-label="Each fault and how the flight ends" tabIndex={0}>
            <table className={`${styles.matrix} ${controls.stackTable}`} role="table">
              <thead role="rowgroup">
                <tr role="row">
                  {Object.values(MATRIX_COLUMNS).map((name) => (
                    <th key={name} scope="col" role="columnheader">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody role="rowgroup">
                {rows.map(({ fault, atCheck, midFlight }) => (
                  <tr key={fault} role="row">
                    <th scope="row" role="rowheader">
                      {FAULT_LABELS[fault]}
                    </th>
                    {(
                      [
                        ['validation', atCheck, MATRIX_COLUMNS.atCheck],
                        ['flight', midFlight, MATRIX_COLUMNS.midFlight],
                      ] as const
                    ).map(([when, f, column]) => {
                      const selected = route === 'sample' && scenario.fault === fault && scenario.when === when;
                      return (
                        <td
                          key={when}
                          role="cell"
                          data-label={column}
                          data-blind={flewBlind(f) || undefined}
                          data-home={f.state === 'rtl' || undefined}
                          data-stopped={!f.flown || undefined}
                        >
                          <button type="button" aria-pressed={selected} title={codes(f)} onClick={() => pick(fault, when)}>
                            <strong>{outcome(f, total)}</strong>
                            <span>{guardLine(f, when, fault)}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ProjectFigureTransition>
      </div>

      <div className={styles.lab}>
        <p className={controls.lead}>
          Two more to try: set the fault after a pause and resume, and nothing watches the flight again; pick the notched fence, and a leg crosses the
          fence the check passed.
        </p>
        <div className={styles.controlsRow}>
          <Segmented
            legend="Fault"
            name="mission-fault"
            value={scenario.fault}
            options={(Object.keys(FAULT_LABELS) as Fault[]).map((f) => ({ value: f, label: FAULT_LABELS[f] }))}
            onChange={(fault) => setScenario({ ...scenario, fault })}
          />
          <Segmented
            legend="When"
            name="mission-when"
            value={scenario.when}
            options={WHEN_OPTIONS.filter((option) => ROUTE_TIMINGS[route].includes(option.value))}
            onChange={(when) => setScenario({ ...scenario, when })}
          />
          <Segmented
            legend="Route"
            name="mission-route"
            value={route}
            options={[
              { value: 'sample', label: 'Sample route, twice' },
              { value: 'notched', label: 'Notched fence', note: 'this page’s example' },
            ]}
            onChange={chooseRoute}
          />
        </div>
        {route === 'notched' && (
          <p className={controls.hint}>
            The notched route has {say(NOTCHED.waypoints.length)} waypoints, so a fault can only be present at the pre-flight check.
          </p>
        )}
        <div className={styles.workspace}>
          <div ref={mapRef} className={styles.mapPanel}>
            <FlightMap mission={mission} flight={flight} />
            <p className={styles.result} data-state={!flight.flown ? 'stopped' : flight.unwatched ? 'unwatched' : flight.state}>
              <strong>{outcome(flight, mission.waypoints.length)}</strong>
              <span>
                {!flight.flown
                  ? 'the check failed, so the mission never reaches approval'
                  : flight.state === 'rtl'
                    ? `returning to launch: ${guardWords(flight.reason)}`
                    : guardWords(flight.reason)}
              </span>
            </p>
            {flight.unwatched && (
              <p className={controls.hint}>
                The resume route sets the mission back to executing and restarts the vehicle, but the executor&apos;s monitor loop (the part that
                polls the drone and asks the guard) ended at the pause and nothing starts it again: no more polls, no safety guard, no completion.
                {scenario.fault !== 'healthy' && ` Here ${MID_FLIGHT_WORDS[scenario.fault]} after the resume, and nothing sees it.`}
              </p>
            )}
            {route === 'notched' && <p className={controls.hint}>{notchWords(flight)}</p>}
          </div>
          <div className={styles.panels}>
            <section aria-label="Pre-flight checks">
              <h3>Pre-flight check</h3>
              <ul className={styles.checks}>
                {flight.validation.checks.map((c) => (
                  <li key={c.name} data-status={c.status}>
                    {c.status === 'passed' ? (
                      <Check aria-hidden="true" />
                    ) : c.status === 'warning' ? (
                      <TriangleAlert aria-hidden="true" />
                    ) : (
                      <Minus aria-hidden="true" />
                    )}
                    <span>{c.name.replace(/_/g, ' ')}</span>
                    <em title={c.reason ?? undefined}>
                      {c.status}
                      {c.reason ? ` · ${checkReason(c.reason)}` : ''}
                    </em>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
        <UnderTheHood summary="The event log, with the original's codes">
          <section aria-label="Event log">
            <h3 className={styles.logTitle}>Event log, on a simulated clock</h3>
            <ol className={styles.events}>
              {!flight.flown && shown.length === 0 && (
                <li data-empty="">No lifecycle events: the mission failed its pre-flight check and never reached approval.</li>
              )}
              {entries.map(({ at, transition }, i) =>
                transition ? (
                  <li key={i} data-state={transition.state}>
                    <span>{(at / 1000).toFixed(1)} s</span>
                    <strong>{transition.state}</strong>
                    <em>
                      {transition.actor} · {transition.reason}
                    </em>
                  </li>
                ) : (
                  <li key={i} data-logged="">
                    <span>{(at / 1000).toFixed(1)} s</span>
                    <strong>logged {logged.length}×</strong>
                    <em>safety_guard · {[...new Set(logged.map((e) => e.reason))].join(', ')}, and nothing else</em>
                  </li>
                ),
              )}
            </ol>
          </section>
        </UnderTheHood>
      </div>
    </div>
  );
}
