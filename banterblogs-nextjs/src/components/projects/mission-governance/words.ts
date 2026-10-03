import type { Flight } from '@/lib/projects/mission-governance/engine';

// The engine's reason codes are the source's own (safety_guard.py,
// validation.py, routes/missions.py); these are their plain words. The codes
// stay in the event log and in each cell's title.

const GUARD_WORDS: Record<string, string> = {
  'blocked.no_telemetry': 'no telemetry',
  'blocked.telemetry_stale': 'telemetry stale',
  'degraded.battery_low': 'battery low',
  'degraded.link_quality': 'link weak',
  'degraded.estimator': 'estimator fault',
  'timeout.mission': 'mission timed out',
  'mission.completed': 'mission completed',
  'mission.resumed': 'resumed, nothing watching',
  'validation.failed': 'pre-flight check failed',
};

/** a guard or lifecycle reason code in plain words, or the code itself when it has none */
export const guardWords = (code: string) => GUARD_WORDS[code] ?? code;

const CHECK_REASONS: [RegExp, (...groups: string[]) => string][] = [
  [/^no_telemetry_available$/, () => 'no telemetry to check'],
  [/^battery_(\d+)_below_(\d+)$/, (now, floor) => `battery ${now}%, below the ${floor}% floor`],
  [/^telemetry_age_(\d+)ms_exceeds_(\d+)ms$/, (age, limit) => `telemetry ${age} ms old, over the ${limit} ms limit`],
  [/^waypoint_seq_(\d+)_outside_geofence$/, (seq) => `waypoint ${seq} outside the fence`],
  [/^waypoint_seq_(\d+)_exceeds_(.+)m$/, (seq, limit) => `waypoint ${seq} above the ${limit} m limit`],
  [/^remote_id_(.+)$/, (status) => `Remote ID ${status.replace(/_/g, ' ')}`],
  [/^no_airspace_auth_ref$/, () => 'no airspace authorization reference'],
];

/** a pre-flight check's reason in plain words */
export function checkReason(reason: string): string {
  for (const [pattern, words] of CHECK_REASONS) {
    const match = pattern.exec(reason);
    if (match) return words(...match.slice(1));
  }
  return reason.replace(/_/g, ' ');
}

/** how a flight ended, in a few words */
export function outcome(flight: Flight, total: number): string {
  if (!flight.flown) return 'stopped at the pre-flight check';
  if (flight.unwatched) return `executing at waypoint ${flight.progress}, unwatched`;
  if (flight.state === 'rtl') return `home after waypoint ${flight.progress}`;
  return total === 2 ? 'flew both waypoints' : `flew all ${total} waypoints`;
}
