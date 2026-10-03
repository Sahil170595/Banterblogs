import { comparePolicies, DEFAULT_CONFIG } from './engine';
import { FIXTURE_VERSION } from './fixtures';

export function fixtureExperiment() {
  return {
    version: 'flight-routing.experiment.v1',
    fixtureVersion: FIXTURE_VERSION,
    config: DEFAULT_CONFIG,
    normal: comparePolicies(DEFAULT_CONFIG, 64),
    tight: comparePolicies({ ...DEFAULT_CONFIG, deadline: 475 }, 64),
  };
}
