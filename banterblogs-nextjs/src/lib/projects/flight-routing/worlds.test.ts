import { describe, expect, it } from 'vitest';
import { comparePolicies, DEFAULT_CONFIG, runPolicy } from './engine';
import { EXPERIMENT_WORLDS, TIGHT_CONFIG } from './experiment';
import recorded from './experiment.json';
import { DISPLAY_POLICIES, evaluateWorlds, worldSeed } from './worlds';

// The page's hero: every policy over the same 64 seeded worlds, one square a
// world. It must agree with the pinned experiment and with a plain replay of
// any single world.

describe('paired world evaluation', () => {
  const tight = evaluateWorlds(TIGHT_CONFIG);

  it('evaluates every displayed policy over the experiment worlds', () => {
    expect(tight.map((row) => row.policy)).toEqual(DISPLAY_POLICIES);
    for (const row of tight) expect(row.worlds).toHaveLength(EXPERIMENT_WORLDS);
  });

  it('agrees with the pinned experiment, per policy and per outcome', () => {
    for (const [config, pinned] of [[DEFAULT_CONFIG, recorded.normal], [TIGHT_CONFIG, recorded.tight]] as const) {
      for (const row of evaluateWorlds(config)) {
        const expected = pinned.rows.find((r) => r.policy === row.policy)!;
        expect(row.onTime, row.policy).toBe(expected.onTime);
        expect(row.onTime + row.late, row.policy).toBe(expected.arrived);
        expect(row.failed, row.policy).toBe(EXPERIMENT_WORLDS - expected.arrived);
        expect(row.meanReward, row.policy).toBeCloseTo(expected.meanReward, 12);
      }
    }
  });

  it('keeps the tight-deadline finding: nonstop never on time, lookahead 40 of 64', () => {
    const byPolicy = Object.fromEntries(tight.map((row) => [row.policy, row]));
    expect(byPolicy.nonstop.onTime).toBe(0);
    expect(byPolicy.deadline.onTime).toBe(40);
  });

  it('labels each square with the outcome a replay of that world reaches', () => {
    const lookahead = tight.find((row) => row.policy === 'deadline')!;
    for (const index of [0, 6, 25, 63]) {
      const episode = runPolicy({ ...TIGHT_CONFIG, seed: worldSeed(TIGHT_CONFIG, index) }, 'deadline');
      const world = lookahead.worlds[index];
      expect(world.reason).toBe(episode.reason);
      expect(world.outcome).toBe(episode.reason !== 'arrived' ? 'failed' : episode.reward.deadline > 0 ? 'on-time' : 'late');
      expect(world.arrival).toBe(episode.reason === 'arrived' ? episode.clock : null);
    }
  });

  it('matches comparePolicies for a non-default configuration', () => {
    const config = { ...DEFAULT_CONFIG, profile: 'storm' as const, scenario: 'east-west' as const, seed: 900 };
    const compared = comparePolicies(config, EXPERIMENT_WORLDS);
    for (const row of evaluateWorlds(config)) {
      const expected = compared.rows.find((r) => r.policy === row.policy)!;
      expect(row.onTime).toBe(expected.onTime);
      expect(row.onTime + row.late).toBe(expected.arrived);
    }
  });
});
