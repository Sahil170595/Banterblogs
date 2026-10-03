import { createSession, score, step } from './engine';
import { DEFAULT_TOTAL_CENTS, SCENARIOS, type Config } from './model';
import { scriptedActions, type Preset } from './scripts';

// Scripted control trajectories, each scored from a fresh synthetic fixture:
// the page's board, case by case, the verified remedy first.

const CONTROLS: { scenario: Config['scenario']; preset: Preset; stock?: number; label: string; variant?: string }[] = [
  { scenario: 'damage', preset: 'verified', label: 'Return and replace' },
  { scenario: 'damage', preset: 'verified', stock: 0, variant: 'no-stock', label: 'No stock: register an alert' },
  { scenario: 'damage', preset: 'claim-only', label: 'Report a refund, issue none' },
  { scenario: 'damage', preset: 'double-remedy', label: 'Replace and also refund' },
  { scenario: 'warehouse', preset: 'verified', label: 'Cancel, then refund' },
  { scenario: 'transit', preset: 'verified', label: 'Request a carrier intercept' },
  { scenario: 'duplicate', preset: 'verified', label: 'Refund the second capture' },
  { scenario: 'duplicate', preset: 'wrong-capture', label: 'Refund the first capture' },
  { scenario: 'duplicate', preset: 'over-refund', label: 'Refund more than was captured' },
  { scenario: 'split', preset: 'verified', label: 'Verify, change nothing, report' },
];
const DEFAULT_STOCK = 2;

export interface ControlMeasurement {
  id: string;
  label: string;
  scenario: Config['scenario'];
  preset: Preset;
  config: Config;
  actions: number;
  effects: number;
  refundedCents: number;
  score: number;
  branch: string;
  completed: boolean;
  damage: boolean;
}

export function measureControls(): ControlMeasurement[] {
  const rank = (scenario: Config['scenario']) => SCENARIOS.findIndex((s) => s.id === scenario);
  return [...CONTROLS]
    .sort((a, b) => rank(a.scenario) - rank(b.scenario))
    .map((c) => {
      const initial = createSession({ scenario: c.scenario, stock: c.stock ?? DEFAULT_STOCK, totalCents: DEFAULT_TOTAL_CENTS });
      const session = scriptedActions(initial.config, c.preset).reduce(step, initial);
      const reward = score(session);
      return {
        id: [c.scenario, c.preset, c.variant].filter(Boolean).join(':'),
        label: c.label,
        scenario: c.scenario,
        preset: c.preset,
        config: initial.config,
        actions: session.events.length,
        effects: session.events.filter((e) => e.changed).length,
        refundedCents: session.world.refunds.reduce((n, r) => n + r.amountCents, 0),
        score: reward.total,
        branch: reward.selectedBranch ?? 'none',
        completed: reward.completed,
        damage: reward.damage,
      };
    });
}
