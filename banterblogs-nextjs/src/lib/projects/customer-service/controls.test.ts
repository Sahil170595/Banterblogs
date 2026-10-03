import { describe, expect, it } from 'vitest';
import { createSession, exportTrace, replayTrace, score, step } from './engine';
import { measureControls } from './measurements';
import { SCENARIOS } from './model';
import { PRESETS, scriptedActions } from './scripts';

describe('fresh synthetic control measurements', () => {
  it('pins the board to current computations, case by case', () => {
    expect(measureControls().map(m => [m.id, m.score])).toEqual([
      ['damage:verified', 1], ['damage:verified:no-stock', 0.6], ['damage:claim-only', -0.3], ['damage:double-remedy', -0.4],
      ['warehouse:verified', 1], ['transit:verified', 0.7],
      ['duplicate:verified', 1], ['duplicate:wrong-capture', -0.4], ['duplicate:over-refund', -0.38],
      ['split:verified', 1],
    ]);
  });

  it('moves the same money in the right and the wrong duplicate refund, and only one is resolved', () => {
    const byId = Object.fromEntries(measureControls().map(m => [m.id, m]));
    const [right, wrong] = [byId['duplicate:verified'], byId['duplicate:wrong-capture']];
    expect(right.refundedCents).toBe(wrong.refundedCents);
    expect(right.completed).toBe(true);
    expect(wrong.completed).toBe(false);
    expect(wrong.damage).toBe(true);
  });

  it('sweeps all five verified paths over stock and order totals', () => {
    for (const scenario of SCENARIOS) for (const stock of [0, 1, 6]) for (const totalCents of [2, 4800, 100000]) {
      const initial = createSession({ scenario: scenario.id, stock, totalCents });
      const session = scriptedActions(initial.config, 'verified').reduce(step, initial);
      expect(score(session).total).toBe(scenario.id === 'transit' ? 0.7 : scenario.id === 'damage' && stock === 0 ? 0.6 : 1);
      expect(session.world.inventory.every(p => p.quantity >= 0)).toBe(true);
      for (const payment of session.world.payments) {
        const refunds = session.world.refunds.filter(r => r.paymentId === payment.id);
        expect(refunds.reduce((n, r) => n + r.amountCents, 0)).toBeLessThanOrEqual(payment.capturedCents);
      }
      expect(replayTrace(exportTrace(session))).toEqual(session);
      expect(initial.world).toEqual(initial.initial);
    }
  });

  it('can execute every deliberate failure path without crashing or changing foreign rows', () => {
    for (const scenario of SCENARIOS) for (const p of PRESETS) {
      const initial = createSession({ scenario: scenario.id });
      const session = scriptedActions(initial.config, p.id).reduce(step, initial);
      expect(Number.isFinite(score(session).total)).toBe(true);
      expect(session.world.orders.find(o => o.id === 'S-990')).toEqual(initial.world.orders.find(o => o.id === 'S-990'));
      expect(session.world.refunds.some(r => r.paymentId === 'PAY-Z')).toBe(false);
    }
  });

  it('requires a report after effects; a later success cannot erase an earlier false report', () => {
    const s = createSession({ scenario: 'duplicate' });
    const actions = scriptedActions(s.config, 'verified');
    const premature = step(s, { kind: 'report', claim: 'refunded', orderId: 'S-410' });
    const recovered = actions.reduce(step, premature);
    expect(score(recovered).completed).toBe(true);
    expect(score(recovered).total).toBeLessThan(1);
    expect(score(recovered).penalties.some(p => p.label.includes('state-divergent'))).toBe(true);
  });

  it('caps out-of-order evidence even when the terminal database is correct', () => {
    const s = createSession({ scenario: 'damage' });
    const script = scriptedActions(s.config, 'verified');
    const reordered = [script[2], script[3], script[4], script[0], script[1], script[5]].reduce(step, s);
    expect(reordered.world.replacements).toHaveLength(1);
    expect(score(reordered).total).toBeLessThanOrEqual(0.4);
    expect(score(reordered).completed).toBe(false);
  });

  it('rejects mismatched consent and cross-order payment references', () => {
    const s = step(createSession({ scenario: 'duplicate' }), { kind: 'choice', resolution: 'refund', orderId: 'S-410', paymentId: 'PAY-A', amountCents: 4800 });
    const wrong = step(s, { kind: 'tool', name: 'refund', args: { orderId: 'S-410', paymentId: 'PAY-B', amountCents: 4800 } });
    expect(wrong.events.at(-1)?.result.code).toBe('consent_required');
    const foreign = step(s, { kind: 'tool', name: 'refund', args: { orderId: 'S-410', paymentId: 'PAY-Z', amountCents: 4800 } });
    expect(foreign.events.at(-1)?.result.code).toBe('not_found_or_unavailable');
    expect(foreign.world).toEqual(s.world);
  });

  it('rejects unsupported reward versions, substituted identity, and a forged initial receipt', () => {
    const trace = exportTrace(createSession());
    expect(() => replayTrace({ ...trace, weightsVersion: 'old-rubric' })).toThrow();
    expect(() => replayTrace({ ...trace, identity: 'account-other' })).toThrow();
    expect(() => replayTrace({ ...trace, initial: { ...trace.initial, intercepts: ['S-410'] } })).toThrow();
  });
});
