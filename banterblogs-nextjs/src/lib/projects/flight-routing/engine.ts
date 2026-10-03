import { FIXTURE_VERSION, getScenario, outcomePool, type Airport, type Flight, type Outcome, type Profile, type ScenarioId } from './fixtures';
import { z } from 'zod';

export const ACTION_SLOTS = 8;
export const POLICIES = ['nonstop', 'greedy', 'deadline', 'random'] as const;
export type Policy = typeof POLICIES[number];
export const POLICY_LABELS: Record<Policy, string> = { nonstop: 'Nonstop first', greedy: 'Greedy next arrival', deadline: 'Deadline lookahead', random: 'Seeded random' };
export interface Config { scenario: ScenarioId; seed: number; deadline: number; horizon: number; buffer: number; maxAttempts: number; profile: Profile; }
export const DEFAULT_CONFIG: Config = { scenario: 'west-east', seed: 42, deadline: 540, horizon: 960, buffer: 30, maxAttempts: 4, profile: 'balanced' };
export type Reason = 'in_progress' | 'arrived' | 'cancelled' | 'unresolved_diversion' | 'horizon' | 'max_attempts' | 'no_candidates' | 'invalid_action' | 'invalid_outcome' | 'missed_departure';
export interface Reward { deadline: number; arrival: number; earliness: number; total: number; }
export interface Leg { flight: Flight; outcome: Outcome; departure: number | null; arrival: number | null; resolvedAirport: Airport | null; }
export interface Episode { config: Config; airport: Airport; clock: number; reason: Reason; legs: Leg[]; reward: Reward; }
export interface ComparisonRow { policy: Policy; arrived: number; onTime: number; meanReward: number; reasons: Partial<Record<Reason, number>>; }
export interface Comparison { count: number; seedStart: number; rows: ComparisonRow[]; }
const ZERO_REWARD: Reward = { deadline: 0, arrival: 0, earliness: 0, total: 0 };
// deadline_first_v1: any on-time arrival outscores any late one
export const REWARD_WEIGHTS = { deadline: 0.8, arrival: 0.1, earliness: 0.1 } as const;
const MAX_SEED = 2147483647;
const MAX_WORLDS = 256;
const DAY_MINUTES = 1440;
/** the bounds a configuration is validated against, shared with the lab's inputs */
export const CONFIG_LIMITS = {
  seed: [0, MAX_SEED], horizon: [60, DAY_MINUTES], deadline: [1, DAY_MINUTES], buffer: [0, DAY_MINUTES], maxAttempts: [1, 6],
} as const;
const bounded = ([min, max]: readonly [number, number]) => z.number().int().min(min).max(max);
/** the configuration's schema, for a caller that reports its issues field by field */
export const CONFIG_SCHEMA = z.object({
  scenario: z.enum(['west-east', 'east-west']),
  profile: z.enum(['clear', 'balanced', 'storm']),
  seed: bounded(CONFIG_LIMITS.seed),
  horizon: bounded(CONFIG_LIMITS.horizon),
  deadline: bounded(CONFIG_LIMITS.deadline),
  buffer: bounded(CONFIG_LIMITS.buffer),
  maxAttempts: bounded(CONFIG_LIMITS.maxAttempts),
}).strict().refine(config => config.deadline <= config.horizon, { message: 'Deadline must not exceed the simulation horizon.' });

export function validateConfig(input: unknown): Config {
  const result = CONFIG_SCHEMA.safeParse(input);
  if (!result.success) throw new Error(result.error.issues.map(issue => `${issue.path.join('.') || 'Scenario'}: ${issue.message}`).join(' '));
  return result.data;
}

export function createEpisode(config: Config): Episode {
  return { config: validateConfig(config), airport: getScenario(config.scenario).origin, clock: 0, reason: 'in_progress', legs: [], reward: { ...ZERO_REWARD } };
}

export function candidates(state: Episode): Flight[] {
  if (state.reason !== 'in_progress') return [];
  return getScenario(state.config.scenario).flights.filter(f => f.origin === state.airport && f.depart >= state.clock + state.config.buffer && f.depart <= state.config.horizon)
    .sort((a,b) => a.depart - b.depart || a.arrive - b.arrive || a.id.localeCompare(b.id)).slice(0, ACTION_SLOTS);
}
export function mask(state: Episode): number[] { const n = candidates(state).length; return Array.from({ length: ACTION_SLOTS }, (_, i) => Number(i < n)); }

// FNV-1a + avalanche replaces the reference's cryptographic rank generator.
// It keys whole donor rows by flight, never by the number/order of decisions.
export function rank(seed: number, key: string): number {
  let hash = 2166136261;
  for (const c of `${seed}:${key}`) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15; hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}
export function sampleOutcome(flight: Flight, config: Config): Outcome {
  const pool = outcomePool(flight, config.profile);
  return pool[Math.floor(rank(config.seed, flight.id) * pool.length)];
}

function finish(state: Episode, reason: Reason): Episode {
  const arrived = reason === 'arrived';
  const reward: Reward = { ...ZERO_REWARD };
  if (arrived) {
    reward.deadline = state.clock <= state.config.deadline ? REWARD_WEIGHTS.deadline : 0;
    reward.arrival = REWARD_WEIGHTS.arrival;
    reward.earliness = REWARD_WEIGHTS.earliness * Math.max(0, Math.min(1, (state.config.horizon - state.clock) / state.config.horizon));
    reward.total = reward.deadline + reward.arrival + reward.earliness;
  }
  return { ...state, reason, reward };
}

function transition(state: Episode, flight: Flight, outcome: Outcome): Episode {
  const next: Episode = { ...state, legs: [...state.legs], reward: { ...ZERO_REWARD } };
  if (outcome.cancelled) {
    next.legs.push({ flight, outcome, departure: null, arrival: null, resolvedAirport: state.airport });
    next.clock = flight.depart;
    return finish(next, 'cancelled');
  }
  const delay = outcome.diverted ? outcome.divDelay : outcome.arrDelay;
  if (outcome.depDelay === null || delay === null || !Number.isFinite(outcome.depDelay) || !Number.isFinite(delay)) {
    next.legs.push({ flight, outcome, departure: null, arrival: null, resolvedAirport: null });
    next.clock = flight.depart;
    return finish(next, 'invalid_outcome');
  }
  const departure = flight.depart + outcome.depDelay;
  const arrival = flight.arrive + delay;
  const resolvedAirport = outcome.diverted && !outcome.reached ? outcome.divAirport : flight.dest;
  next.legs.push({ flight, outcome, departure, arrival, resolvedAirport });
  if (departure < state.clock) return finish(next, 'missed_departure');
  if (arrival <= departure) return finish({ ...next, clock: Math.min(departure, state.config.horizon) }, 'invalid_outcome');
  if (outcome.diverted && !outcome.reached) return finish({ ...next, clock: Math.min(arrival, state.config.horizon) }, 'unresolved_diversion');
  if (arrival > state.config.horizon) return finish({ ...next, clock: state.config.horizon }, 'horizon');
  next.clock = arrival; next.airport = flight.dest;
  if (next.airport === getScenario(state.config.scenario).destination) return finish(next, 'arrived');
  if (next.clock >= state.config.horizon) return finish(next, 'horizon');
  if (next.legs.length >= state.config.maxAttempts) return finish(next, 'max_attempts');
  if (!candidates(next).length) return finish(next, 'no_candidates');
  return next;
}

export function step(state: Episode, action: number, donorIndex?: number): Episode {
  if (state.reason !== 'in_progress') throw new Error('Episode terminated. Reset before selecting another action.');
  if (!Number.isInteger(action) || action < 0 || action >= ACTION_SLOTS) throw new Error(`Action must be an integer from 0 to ${ACTION_SLOTS - 1}.`);
  const available = candidates(state);
  if (!available.length) return finish(state, 'no_candidates');
  if (!available[action]) return finish(state, 'invalid_action');
  const flight = available[action];
  const pool = outcomePool(flight, state.config.profile);
  if (donorIndex !== undefined && (!Number.isInteger(donorIndex) || donorIndex < 0 || donorIndex >= pool.length)) throw new Error('Donor index must identify a fixture row.');
  return transition(state, flight, donorIndex === undefined ? sampleOutcome(flight, state.config) : pool[donorIndex]);
}

function deadlineValue(state: Episode, cache: Map<string, number>): number {
  if (state.reason !== 'in_progress') return Number(state.reason === 'arrived' && state.clock <= state.config.deadline);
  const key = `${state.airport}:${state.clock}:${state.legs.length}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const values = candidates(state).map(f => expectedDeadline(state, f, cache));
  const value = values.length ? Math.max(...values) : 0;
  cache.set(key, value);
  return value;
}
function expectedDeadline(state: Episode, flight: Flight, cache: Map<string, number>): number {
  const pool = outcomePool(flight, state.config.profile);
  return pool.reduce((sum, outcome) => sum + deadlineValue(transition(state, flight, outcome), cache), 0) / pool.length;
}
export function actionValues(state: Episode): number[] {
  const cache = new Map<string, number>();
  return candidates(state).map(f => expectedDeadline(state, f, cache));
}
/**
 * The lookahead's pick, as Gatebound's DeadlinePlannerPolicy.act makes it: the
 * highest chance of making the deadline, then the earliest scheduled arrival,
 * then the lowest index.
 */
export function bestAction(values: number[], flights: Pick<Flight, 'arrive'>[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best] || (values[i] === values[best] && flights[i].arrive < flights[best].arrive)) best = i;
  }
  return best;
}
export function chooseAction(state: Episode, policy: Policy): number {
  if (!POLICIES.includes(policy)) throw new Error('Choose a listed policy.');
  const flights = candidates(state);
  if (!flights.length) return 0;
  if (policy === 'random') return Math.floor(rank(state.config.seed, `action:${state.legs.length}`) * flights.length);
  if (policy === 'deadline') return bestAction(actionValues(state), flights);
  if (policy === 'nonstop') {
    const direct = flights.filter(f => f.dest === getScenario(state.config.scenario).destination).sort((a,b) => a.arrive - b.arrive);
    return direct.length ? flights.indexOf(direct[0]) : 0;
  }
  return flights.indexOf([...flights].sort((a,b) => a.arrive - b.arrive)[0]);
}
export function runPolicy(config: Config, policy: Policy): Episode {
  let state = createEpisode(config);
  while (state.reason === 'in_progress') state = step(state, chooseAction(state, policy));
  return state;
}
export function comparePolicies(config: Config, count: number): Comparison {
  validateConfig(config);
  if (!Number.isInteger(count) || count < 1 || count > MAX_WORLDS || config.seed + count - 1 > MAX_SEED) throw new Error(`Use 1-${MAX_WORLDS} worlds and a seed range within 0-${MAX_SEED}.`);
  return { count, seedStart: config.seed, rows: POLICIES.map(policy => {
    const row: ComparisonRow = { policy, arrived: 0, onTime: 0, meanReward: 0, reasons: {} };
    for (let i = 0; i < count; i++) {
      const episode = runPolicy({ ...config, seed: config.seed + i }, policy);
      row.arrived += Number(episode.reason === 'arrived');
      row.onTime += Number(episode.reward.deadline > 0);
      row.meanReward += episode.reward.total / count;
      row.reasons[episode.reason] = (row.reasons[episode.reason] ?? 0) + 1;
    }
    return row;
  }) };
}
export function exportTrace(episode: Episode, comparison: Comparison | null = null): string {
  return JSON.stringify({ version: 'flight-routing.trace.v1', fixtureVersion: FIXTURE_VERSION, sampling: 'flight-keyed-fnv-avalanche-v1', scoreProfile: 'deadline_first_v1', scope: 'Synthetic adaptive routing; no forecast, training or seat inventory.', config: episode.config, episode, comparison }, null, 2);
}
export function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
