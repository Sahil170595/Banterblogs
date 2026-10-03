import { createSession, score, step } from './engine';
import { SCENARIOS } from './model';
import { scriptedActions, type Preset } from './scripts';

export function measureControls() {
  const configurations = [
    ...SCENARIOS.map(s => ({ scenario: s.id, stock: 2, preset: 'verified' as Preset, label: s.title })),
    { scenario: 'damage' as const, stock: 0, preset: 'verified' as Preset, label: 'No preferred stock: alert' },
    { scenario: 'damage' as const, stock: 2, preset: 'claim-only' as Preset, label: 'Claim without effect' },
    { scenario: 'damage' as const, stock: 2, preset: 'double-remedy' as Preset, label: 'Refund + replacement conflict' },
    { scenario: 'duplicate' as const, stock: 2, preset: 'wrong-capture' as Preset, label: 'First capture refunded' },
    { scenario: 'duplicate' as const, stock: 2, preset: 'over-refund' as Preset, label: 'Oversized refund, then success claim' },
  ];
  return configurations.map(c => {
    const initial = createSession({ scenario: c.scenario, stock: c.stock, totalCents: 4800 });
    const session = scriptedActions(initial.config, c.preset).reduce(step, initial);
    const reward = score(session);
    return { label: c.label, actions: session.events.length, effects: session.events.filter(e => e.changed).length,
      score: reward.total, branch: reward.selectedBranch ?? 'none', scenario: c.scenario, stock: c.stock, preset: c.preset };
  });
}
