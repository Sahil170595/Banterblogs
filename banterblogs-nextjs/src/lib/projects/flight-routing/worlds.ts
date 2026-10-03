import { runPolicy, type Config, type Policy, type Reason } from './engine';
import { EXPERIMENT_WORLDS } from './experiment';

// Every policy over the same seeded worlds, one record a world: the grid at
// the top of the page and the index the replay below it opens from.

/** the hero's panel order: the two policies the finding compares, then the baselines */
export const DISPLAY_POLICIES: Policy[] = ['nonstop', 'deadline', 'greedy', 'random'];

export type WorldOutcome = 'on-time' | 'late' | 'failed';

export interface World {
  seed: number;
  outcome: WorldOutcome;
  reason: Reason;
  /** landing clock at the destination, or null when the passenger never arrived */
  arrival: number | null;
}

export interface PolicyWorlds {
  policy: Policy;
  worlds: World[];
  onTime: number;
  late: number;
  failed: number;
  meanReward: number;
}

export function worldSeed(config: Config, index: number): number {
  return config.seed + index;
}

export function evaluateWorlds(config: Config, count = EXPERIMENT_WORLDS): PolicyWorlds[] {
  return DISPLAY_POLICIES.map((policy) => {
    const row: PolicyWorlds = { policy, worlds: [], onTime: 0, late: 0, failed: 0, meanReward: 0 };
    for (let index = 0; index < count; index++) {
      const seed = worldSeed(config, index);
      const episode = runPolicy({ ...config, seed }, policy);
      const arrived = episode.reason === 'arrived';
      const outcome: WorldOutcome = !arrived ? 'failed' : episode.reward.deadline > 0 ? 'on-time' : 'late';
      row.worlds.push({ seed, outcome, reason: episode.reason, arrival: arrived ? episode.clock : null });
      if (outcome === 'on-time') row.onTime++;
      else if (outcome === 'late') row.late++;
      else row.failed++;
      row.meanReward += episode.reward.total / count;
    }
    return row;
  });
}
