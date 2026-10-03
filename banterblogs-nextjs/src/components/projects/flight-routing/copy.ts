import { formatTime, type Config, type Policy } from '@/lib/projects/flight-routing/engine';
import { getScenario, outcomePool, type Profile } from '@/lib/projects/flight-routing/fixtures';
import type { PolicyWorlds } from '@/lib/projects/flight-routing/worlds';

// The demo's plain words, computed from the engine and the fixture so they
// cannot drift from what the panels show. No client hooks: the page reads
// them on the server too.

/** what each policy does, read off chooseAction */
export const POLICY_TEXT: Record<Policy, string> = {
  nonstop: 'Books the earliest nonstop to the destination.',
  greedy: 'Takes whichever flight lands soonest, wherever it goes.',
  deadline: 'Plans every leg ahead and books the flight most likely to make the deadline.',
  random: 'Picks a bookable flight at random, the same pick every time in a given world.',
};

/** the reward in one sentence, from its weights and the horizon */
export function rewardNote(config: Pick<Config, 'deadline' | 'horizon'>, weights: { deadline: number; arrival: number; earliness: number }): string {
  return (
    `The reward is paid when the trip ends: ${weights.deadline.toFixed(2)} for landing by the ${formatTime(config.deadline)} deadline, ` +
    `${weights.arrival.toFixed(2)} for landing at all, and up to ${weights.earliness.toFixed(2)} more the earlier the landing ` +
    `before the horizon, ${formatTime(config.horizon)}, when the simulated day ends.`
  );
}

export const PROFILE_LABEL: Record<Profile, string> = { clear: 'Clear', balanced: 'Mixed', storm: 'Stress' };

const MINUTES_PER_HOUR = 60;

/** the earliest nonstop: origin straight to destination, not a connection's second leg */
function firstNonstop(config: Pick<Config, 'scenario'>) {
  const { flights, origin, destination } = getScenario(config.scenario);
  return flights.filter((f) => f.origin === origin && f.dest === destination).sort((a, b) => a.arrive - b.arrive)[0];
}

/** the scheduled landing a deadline is measured against */
export function nonstopLanding(config: Pick<Config, 'scenario'>): number {
  return firstNonstop(config).arrive;
}

function duration(minutes: number): string {
  if (minutes % MINUTES_PER_HOUR === 0) {
    const hours = minutes / MINUTES_PER_HOUR;
    return hours === 1 ? 'an hour' : `${hours} hours`;
  }
  return `${minutes} min`;
}

/** where a deadline sits against the nonstop's landing, e.g. "5 min before the nonstop lands" */
export function deadlineNote(deadline: number, config: Pick<Config, 'scenario'>): string {
  const gap = deadline - nonstopLanding(config);
  if (gap === 0) return 'as the nonstop lands';
  return gap < 0 ? `${duration(-gap)} before the nonstop lands` : `${duration(gap)} after the nonstop lands`;
}

const times = (count: number, of: number) => `${count} ${count === 1 ? 'time' : 'times'} in ${of}`;

/** what a disruption profile does to a flight, counted from the nonstop's outcome pool */
export function profileNote(profile: Profile, config: Pick<Config, 'scenario'>): string {
  const pool = outcomePool(firstNonstop(config), profile);
  const cancelled = pool.filter((o) => o.cancelled).length;
  const disrupted = pool.filter((o) => !o.cancelled && (o.diverted || (o.arrDelay ?? 0) > 0)).length;
  if (cancelled === 0 && disrupted === 0) return `${PROFILE_LABEL[profile]}: every flight runs to time.`;
  return `${PROFILE_LABEL[profile]}: each flight is cancelled ${times(cancelled, pool.length)} and delayed or diverted ${times(disrupted, pool.length)}.`;
}

const arrived = (row: PolicyWorlds) => row.onTime + row.late;

/** the grid's headline: the planner against the nonstop, for whatever the controls are set to */
export function gridHeadline(rows: PolicyWorlds[]): string {
  const by = (policy: Policy) => rows.find((r) => r.policy === policy)!;
  const nonstop = by('nonstop');
  const planner = by('deadline');
  const count = nonstop.worlds.length;
  if (planner.onTime === nonstop.onTime && arrived(planner) === arrived(nonstop)) {
    return `Here Deadline lookahead and Nonstop first come out the same: both on time in ${planner.onTime} of ${count} worlds.`;
  }
  const lead = `Deadline lookahead is on time in ${planner.onTime} of ${count} worlds, Nonstop first in ${nonstop.onTime}.`;
  const gap = arrived(nonstop) - arrived(planner);
  if (gap > 0) return `${lead} Lookahead gets ${gap} fewer passengers there at all (${arrived(planner)} against ${arrived(nonstop)}).`;
  if (gap < 0) return `${lead} It also gets ${-gap} more passengers there at all (${arrived(planner)} against ${arrived(nonstop)}).`;
  return lead;
}

/** a minutes-after-midnight field's clock reading, when it is a whole number */
export function clockOf(draft: string): string | null {
  const minutes = Number(draft);
  return draft.trim() && Number.isInteger(minutes) && minutes >= 0 ? formatTime(minutes) : null;
}
