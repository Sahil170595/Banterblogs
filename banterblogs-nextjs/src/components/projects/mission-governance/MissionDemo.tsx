'use client';

import { useMemo, useState } from 'react';
import { Check, Minus, TriangleAlert } from 'lucide-react';
import { LONG_MISSION, SAMPLE_MISSION, type Mission } from '@/lib/projects/mission-governance/contract';
import { fly, type Fault, type Flight, type Scenario } from '@/lib/projects/mission-governance/engine';
import { faultMatrix, flewBlind, MID_FLIGHT_AFTER } from '@/lib/projects/mission-governance/matrix';
import { controls, Segmented } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import { FlightMap } from './FlightMap';
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
const say = (n: number) => ['no', 'one', 'two', 'three', 'four', 'five', 'six'][n] ?? String(n);

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

function outcome(flight: Flight, total: number): string {
  if (!flight.flown) return 'stopped at the pre-flight check';
  if (flight.unwatched) return `executing at waypoint ${flight.progress}, unwatched`;
  if (flight.state === 'rtl') return `home after waypoint ${flight.progress}`;
  return `flew all ${total}`;
}

function verdict(flight: Flight): string {
  if (!flight.validation.passed) return 'failed';
  return flight.validation.checks.some((c) => c.status === 'warning') ? 'passed with warnings' : 'passed';
}

/**
 * The mission page's live demo: every telemetry fault, present at the
 * pre-flight check or starting mid-flight, and how the flight ends; then one
 * scenario in full, on a map, with the checks and the event log.
 */
export function MissionDemo() {
  const rows = useMemo(() => faultMatrix(), []);
  const [route, setRoute] = useState<Route>('sample');
  const [scenario, setScenario] = useState<Scenario>({ fault: 'missing', when: 'validation', afterPolls: MID_FLIGHT_AFTER, stall: false });
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
  };
  const logged = flight.events.filter((e) => e.kind === 'logged');
  const shown = flight.events.filter((e) => e.kind === 'transition');

  return (
    <div className={styles.demo}>
      <div className={styles.hero}>
        <p className={styles.headline}>
          The sample mission declares that a lost link means {POLICY_WORDS[LONG_MISSION.constraints.link_loss_policy]}. Nothing reads that
          field. With no telemetry at all, it passes the pre-flight check with {say(warnings)} warnings and{' '}
          {missing.atCheck.state === 'completed' ? `flies all ${total} waypoints` : outcome(missing.atCheck, total)}; when {blind.join(' or ')}{' '}
          mid-flight, the guard logs it and the flight goes on.
        </p>
        <ProjectFigureTransition slug="mission-governance">
          <div className={styles.tableScroll} role="region" aria-label="Each fault and how the flight ends" tabIndex={0}>
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th scope="col">Fault</th>
                  <th scope="col">Present at the pre-flight check</th>
                  <th scope="col">Starts after waypoint {MID_FLIGHT_AFTER}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ fault, atCheck, midFlight }) => (
                  <tr key={fault}>
                    <th scope="row">{FAULT_LABELS[fault]}</th>
                    {([
                      ['validation', atCheck],
                      ['flight', midFlight],
                    ] as const).map(([when, f]) => {
                      const selected = route === 'sample' && scenario.fault === fault && scenario.when === when;
                      return (
                        <td key={when} data-blind={flewBlind(f) || undefined} data-home={f.state === 'rtl' || undefined}>
                          <button type="button" aria-pressed={selected} onClick={() => pick(fault, when)}>
                            <strong>{outcome(f, total)}</strong>
                            <span>
                              {when === 'validation' ? `check ${verdict(f)}` : 'check passed'}
                              {flewBlind(f) && ` · ${f.logged.join(', ')} logged`}
                              {f.state === 'rtl' && ` · ${f.reason}`}
                            </span>
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
        <p className={styles.caption}>
          The source&apos;s own sample route, flown twice so a fault that starts mid-flight has a flight left to change. Red marks a flight that
          finished its route while the guard reported it could not see the vehicle. Pick a cell to fly it below.
        </p>
      </div>

      <div className={styles.lab}>
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
            options={[
              { value: 'validation', label: 'At the pre-flight check' },
              { value: 'flight', label: `After waypoint ${MID_FLIGHT_AFTER}` },
              { value: 'resumed', label: 'After a pause and resume' },
            ]}
            onChange={(when) => setScenario({ ...scenario, when })}
          />
          <Segmented
            legend="Route"
            name="mission-route"
            value={route}
            options={[
              { value: 'sample', label: 'Sample route, twice' },
              { value: 'notched', label: 'Notched fence' },
            ]}
            onChange={setRoute}
          />
        </div>
        <div className={styles.workspace}>
          <div className={styles.mapPanel}>
            <FlightMap mission={mission} flight={flight} />
            <p className={styles.result} data-state={!flight.flown ? 'stopped' : flight.unwatched ? 'unwatched' : flight.state}>
              <strong>{outcome(flight, mission.waypoints.length)}</strong>
              <span>
                {flight.flown ? `${flight.state} · ${flight.reason}` : 'validation failed; the route never reaches approval'}
              </span>
            </p>
            {flight.unwatched && (
              <p className={controls.hint}>
                The resume route sets the mission back to executing and restarts the vehicle, but the executor&apos;s monitor loop ended
                at the pause and nothing starts it again: no more polls, no safety guard, no completion.
              </p>
            )}
            {route === 'notched' && (
              <p className={controls.hint}>
                Both waypoints sit inside the fence, so the check passes; the straight leg between them crosses the notch. The marked point is
                where it leaves.
              </p>
            )}
          </div>
          <div className={styles.panels}>
            <section aria-label="Pre-flight checks">
              <h3>Pre-flight check</h3>
              <ul className={styles.checks}>
                {flight.validation.checks.map((c) => (
                  <li key={c.name} data-status={c.status}>
                    {c.status === 'passed' ? <Check aria-hidden="true" /> : c.status === 'warning' ? <TriangleAlert aria-hidden="true" /> : <Minus aria-hidden="true" />}
                    <span>{c.name.replace(/_/g, ' ')}</span>
                    <em>{c.status}{c.reason ? ` · ${c.reason}` : ''}</em>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-label="Event log">
              <h3>Event log</h3>
              <ol className={styles.events}>
                {shown.map((e, i) => (
                  <li key={i} data-state={e.state}>
                    <span>{(e.at / 1000).toFixed(1)} s</span>
                    <strong>{e.state}</strong>
                    <em>
                      {e.actor} · {e.reason}
                    </em>
                  </li>
                ))}
                {logged.length > 0 && (
                  <li data-logged="">
                    <span>{(logged[0].at / 1000).toFixed(1)} s</span>
                    <strong>logged {logged.length}×</strong>
                    <em>safety_guard · {[...new Set(logged.map((e) => e.reason))].join(', ')}, and nothing else</em>
                  </li>
                )}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
