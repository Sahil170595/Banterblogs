import { comparePolicies, DEFAULT_CONFIG, type Config } from './engine';
import { FIXTURE_VERSION } from './fixtures';

/** worlds per comparison: an 8x8 grid on the page */
export const EXPERIMENT_WORLDS = 64;
/** five minutes before the nonstop's 08:00 scheduled arrival, so no nonstop landing is on time */
export const TIGHT_DEADLINE = 475;
export const TIGHT_CONFIG: Config = { ...DEFAULT_CONFIG, deadline: TIGHT_DEADLINE };

export function fixtureExperiment() {
  return {
    version: 'flight-routing.experiment.v1',
    fixtureVersion: FIXTURE_VERSION,
    config: DEFAULT_CONFIG,
    normal: comparePolicies(DEFAULT_CONFIG, EXPERIMENT_WORLDS),
    tight: comparePolicies(TIGHT_CONFIG, EXPERIMENT_WORLDS),
  };
}
