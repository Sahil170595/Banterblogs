import { describe, expect, it } from 'vitest';
import { createSession, exportTrace, replayTrace, score, step } from './engine';

const tool = (name: string, args: Record<string, unknown> = { orderId: 'S-410' }) => ({ kind: 'tool', name, args });
const choice = (resolution: string, extra = {}) => ({ kind: 'choice', resolution, orderId: 'S-410', ...extra });
const report = (claim: string) => ({ kind: 'report', claim, orderId: 'S-410' });
const run = (scenario: string, actions: unknown[], stock = 2) => actions.reduce<ReturnType<typeof createSession>>(
  (s, a) => step(s, a), createSession({ scenario, stock, totalCents: 4800 }),
);
const refund = tool('refund', { orderId: 'S-410', paymentId: 'PAY-A', amountCents: 4800 });
const replacement = tool('replace', { orderId: 'S-410', sku: 'LAMP-MOSS' });
const damagedReads = [tool('order'), tool('payments'), tool('inventory', {})];

describe('guarded service tools', () => {
  it('rejects malformed fixtures instead of substituting defaults', () => {
    for (const config of [{ scenario: 'unknown' }, { stock: -1 }, { totalCents: NaN }, { totalCents: 1.2 }, { stock: 100 }]) {
      expect(() => createSession(config)).toThrow();
    }
  });

  it('uses trusted session identity and gives identical foreign/missing observations', () => {
    const s = createSession();
    const foreign = step(s, tool('order', { orderId: 'S-990' }));
    const missing = step(s, tool('order', { orderId: 'S-NONE' }));
    expect(foreign.events[0].result).toEqual(missing.events[0].result);
    expect(foreign.world).toEqual(s.world);
    const spoof = step(s, tool('cancel', { orderId: 'S-990', userId: 'account-other' }));
    expect(spoof.events[0].result.code).toBe('invalid_arguments');
  });

  it('cancels only warehouse orders; denials are atomic', () => {
    const warehouse = run('warehouse', [tool('order'), tool('payments'), choice('cancel'), tool('cancel')]);
    expect(warehouse.world.orders[0].status).toBe('cancelled');
    const transit = run('transit', [choice('cancel'), tool('cancel')]);
    expect(transit.world).toEqual(transit.initial);
    expect(transit.events.at(-1)?.result.code).toBe('policy_denied');
  });

  it('requires an exact choice and refuses unapproved or oversized refunds', () => {
    const noChoice = run('duplicate', [refund]);
    expect(noChoice.events[0].result.code).toBe('consent_required');
    const oversized = run('duplicate', [choice('refund', { paymentId: 'PAY-B', amountCents: 4801 }),
      tool('refund', { orderId: 'S-410', paymentId: 'PAY-B', amountCents: 4801 })]);
    expect(oversized.world).toEqual(oversized.initial);
    expect(oversized.events.at(-1)?.result.code).toBe('policy_denied');
  });

  it('replays exact writes once and retains balance protection for changed arguments', () => {
    const first = run('duplicate', [choice('refund', { paymentId: 'PAY-B', amountCents: 4800 }),
      tool('refund', { orderId: 'S-410', paymentId: 'PAY-B', amountCents: 4800 })]);
    const retry = step(first, tool('refund', { amountCents: 4800, paymentId: 'PAY-B', orderId: ' S-410 ' }));
    expect(retry.world).toEqual(first.world);
    expect(retry.events.at(-1)?.result.code).toBe('idempotent_replay');
    const changed = step(step(retry, choice('refund', { paymentId: 'PAY-B', amountCents: 1 })),
      tool('refund', { orderId: 'S-410', paymentId: 'PAY-B', amountCents: 1 }));
    expect(changed.world).toEqual(first.world);
    expect(changed.events.at(-1)?.result.code).toBe('policy_denied');
  });

  it('creates one replacement, consumes one stock unit, and rejects alternate-SKU retries', () => {
    const s = run('damage', [choice('replace', { sku: 'LAMP-MOSS' }), tool('return'), replacement]);
    expect(s.world.inventory.find(p => p.sku === 'LAMP-MOSS')?.quantity).toBe(1);
    expect(s.world.replacements).toHaveLength(1);
    expect(step(s, replacement).world).toEqual(s.world);
    const alternate = step(step(s, choice('replace', { sku: 'LAMP-INK' })), tool('replace', { orderId: 'S-410', sku: 'LAMP-INK' }));
    expect(alternate.events.at(-1)?.result.code).toBe('policy_denied');
    expect(alternate.world).toEqual(s.world);
  });

  it('rejects a replacement without a return or with no stock', () => {
    const noReturn = run('damage', [choice('replace', { sku: 'LAMP-MOSS' }), replacement]);
    expect(noReturn.events.at(-1)?.result.code).toBe('policy_denied');
    const noStock = run('damage', [choice('replace', { sku: 'LAMP-MOSS' }), tool('return'), replacement], 0);
    expect(noStock.world.replacements).toHaveLength(0);
    expect(noStock.world.inventory[0].quantity).toBe(0);
  });

  it('separates a carrier request from actual cancellation and delivery', () => {
    const s = run('transit', [choice('intercept'), tool('intercept')]);
    expect(s.world.orders[0].status).toBe('shipped');
    expect(s.world.intercepts).toEqual(['S-410']);
    expect(step(s, tool('intercept')).world).toEqual(s.world);
    expect(step(createSession({ scenario: 'damage' }), tool('intercept')).events[0].result.ok).toBe(false);
  });

  it('bounds episode activity and resets with no shared mutations', () => {
    const initial = createSession();
    let s = initial;
    for (let i = 0; i < 100; i++) s = step(s, tool('order'));
    expect(s.termination).toBe('no_progress');
    expect(s.events.length).toBeLessThan(100);
    expect(createSession().world).toEqual(initial.world);
    expect(initial.events).toHaveLength(0);
  });

  it.each([0, -1, 1.5, NaN, Infinity, '4800'])('rejects invalid cents %s', amountCents => {
    const s = run('duplicate', [tool('refund', { orderId: 'S-410', paymentId: 'PAY-B', amountCents })]);
    expect(s.events[0].result.code).toBe('invalid_arguments');
    expect(s.world).toEqual(s.initial);
  });
});

describe('state-grounded, branch-coherent reward', () => {
  it('gives empty activity no reward, and unsupported reports less than no action', () => {
    const s = createSession();
    expect(score(s).total).toBe(0);
    expect(score(step(s, report('refunded'))).total).toBeLessThan(0);
  });

  it('certifies cancellation only after both cancellation and exact refund', () => {
    const actions = [tool('order'), tool('payments'), choice('cancel'), tool('cancel'),
      choice('refund', { paymentId: 'PAY-A', amountCents: 4800 }), refund];
    const s = run('warehouse', actions);
    expect(score(s).total).toBeLessThan(1);
    expect(score(step(s, report('cancelled-and-refunded'))).total).toBe(1);
  });

  it.each([
    [tool('order'), choice('cancel'), tool('cancel'), tool('payments'),
      choice('refund', { paymentId: 'PAY-A', amountCents: 4800 }), refund],
    [tool('payments'), tool('order'), choice('refund', { paymentId: 'PAY-A', amountCents: 4800 }), refund,
      choice('cancel'), tool('cancel')],
  ])('accepts independent warehouse actions in either safe order %#', (...actions) => {
    const s = run('warehouse', [...actions, report('cancelled-and-refunded')]);
    expect(s.events.every(e => e.result.ok)).toBe(true);
    expect(score(s)).toMatchObject({ total: 1, completed: true, verification: { verified: 2, count: 2 } });
    expect(score(replayTrace(exportTrace(s)))).toEqual(score(s));
  });

  it.each([
    [tool('order'), choice('refund', { paymentId: 'PAY-A', amountCents: 4800 }), tool('return'), tool('payments'), refund],
    [tool('payments'), tool('order'), choice('refund', { paymentId: 'PAY-A', amountCents: 4800 }), refund, tool('return')],
  ])('accepts independent damage refund actions in either safe order %#', (...actions) => {
    expect(score(run('damage', [...actions, report('refunded')]))).toMatchObject({ total: 1, completed: true });
  });

  it('allows return before inventory evidence but requires evidence before replacement', () => {
    const s = run('damage', [tool('order'), choice('replace', { sku: 'LAMP-MOSS' }), tool('return'),
      tool('inventory', {}), replacement, report('replacement-created')]);
    expect(score(s)).toMatchObject({ total: 1, completed: true });
  });

  it('does not repair missing prior evidence with later reads or idempotent writes', () => {
    const s = run('warehouse', [choice('cancel'), tool('cancel'), tool('order'), tool('payments'), tool('cancel'),
      choice('refund', { paymentId: 'PAY-A', amountCents: 4800 }), refund, report('cancelled-and-refunded')]);
    expect(s.world.orders[0].status).toBe('cancelled');
    expect(s.world.refunds).toHaveLength(1);
    expect(score(s).completed).toBe(false);
    expect(score(s).total).toBeLessThanOrEqual(0.4);
  });

  it('cannot use consent recorded after a write or superseded by another choice', () => {
    const valid = run('warehouse', [tool('order'), tool('payments'), choice('cancel'), tool('cancel'),
      choice('refund', { paymentId: 'PAY-A', amountCents: 4800 }), refund, report('cancelled-and-refunded')]);
    const delayed = structuredClone(valid);
    const cancelChoice = delayed.events.find(e => e.action?.kind === 'choice' && e.action.resolution === 'cancel')!;
    cancelChoice.index = 100;
    expect(score(delayed).completed).toBe(false);
    const superseded = structuredClone(valid);
    const refundChoice = superseded.events.find(e => e.action?.kind === 'choice' && e.action.resolution === 'refund')!;
    refundChoice.index = 3.5;
    expect(score(superseded).completed).toBe(false);
  });

  it('requires all effects before a report, even when an early report already describes a refund', () => {
    const s = run('damage', [tool('order'), tool('payments'), choice('refund', { paymentId: 'PAY-A', amountCents: 4800 }),
      refund, report('refunded'), tool('return')]);
    expect(score(s).completed).toBe(false);
    expect(score(step(s, report('refunded')))).toMatchObject({ total: 1, completed: true });
  });

  it('requires duplicate refund on the redundant payment, not just equal money', () => {
    const good = run('duplicate', [tool('order'), tool('payments'), choice('refund', { paymentId: 'PAY-B', amountCents: 4800 }),
      tool('refund', { orderId: 'S-410', paymentId: 'PAY-B', amountCents: 4800 }), report('refunded')]);
    const wrong = run('duplicate', [tool('order'), tool('payments'), choice('refund', { paymentId: 'PAY-A', amountCents: 4800 }), refund, report('refunded')]);
    expect(score(good).total).toBe(1);
    expect(score(wrong).total).toBeLessThan(0);
  });

  it('does not combine incompatible refund and replacement branches', () => {
    const s = run('damage', [...damagedReads, choice('replace', { sku: 'LAMP-MOSS' }), tool('return'), replacement,
      choice('refund', { paymentId: 'PAY-A', amountCents: 4800 }), refund, report('refunded')]);
    expect(s.world.refunds).toHaveLength(1);
    expect(s.world.replacements).toHaveLength(1);
    expect(score(s).branches.every(b => !b.stateSatisfied)).toBe(true);
    expect(score(s).total).toBeLessThan(0);
  });

  it('awards an evidence-based restraint branch, never absence alone', () => {
    expect(score(createSession({ scenario: 'split' })).total).toBe(0);
    const s = run('split', [tool('order'), tool('payments'), report('split-tender')]);
    expect(score(s).total).toBe(1);
    const mistaken = run('split', [tool('order'), tool('payments'), choice('refund', { paymentId: 'PAY-B', amountCents: 2400 }),
      tool('refund', { orderId: 'S-410', paymentId: 'PAY-B', amountCents: 2400 }), report('split-tender')]);
    expect(score(mistaken).total).toBeLessThan(0);
  });

  it('caps request-only and notification outcomes below complete remedies', () => {
    const intercept = run('transit', [tool('order'), choice('intercept'), tool('intercept'), report('intercept-requested')]);
    expect(score(intercept).total).toBe(0.7);
    const notify = run('damage', [...damagedReads, choice('notify', { sku: 'LAMP-MOSS' }), tool('notify', { orderId: 'S-410', sku: 'LAMP-MOSS' }), report('notification-registered')], 0);
    expect(score(notify).total).toBe(0.6);
  });

  it('replays a versioned trace and refuses a modified final-state receipt', () => {
    const s = run('damage', [...damagedReads, choice('replace', { sku: 'LAMP-MOSS' }), tool('return'), replacement, report('replacement-created')]);
    expect(score(s).total).toBe(1);
    const trace = exportTrace(s);
    expect(replayTrace(JSON.parse(JSON.stringify(trace)))).toEqual(s);
    expect(() => replayTrace({ ...trace, version: 'unsupported' })).toThrow();
    expect(() => replayTrace({ ...trace, final: { ...trace.final, refunds: [] , intercepts: ['fake'] } })).toThrow();
  });

  // live QA: an edited reward or event list replayed as if it were the receipt
  it('refuses a trace whose reward or events were edited', () => {
    const s = run('duplicate', [tool('order'), tool('payments'), choice('refund', { paymentId: 'PAY-B', amountCents: 4800 }),
      tool('refund', { orderId: 'S-410', paymentId: 'PAY-B', amountCents: 4800 }), report('refunded')]);
    const trace = JSON.parse(JSON.stringify(exportTrace(s)));
    const edited = (change: (t: typeof trace) => void) => {
      const copy = JSON.parse(JSON.stringify(trace));
      change(copy);
      return copy;
    };
    expect(() => replayTrace(edited((t) => { t.reward.total = 0.5; }))).toThrow(/reward/);
    expect(() => replayTrace(edited((t) => { t.reward.components[0].value = 0; }))).toThrow(/reward/);
    expect(() => replayTrace(edited((t) => { t.events[3].result.code = 'policy_denied'; }))).toThrow(/events/);
    expect(() => replayTrace(edited((t) => { t.events[0].result.message = 'edited'; }))).toThrow(/events/);
    expect(() => replayTrace(edited((t) => { t.events.pop(); }))).toThrow(/events/);
    expect(replayTrace(trace)).toEqual(s);
  });

  // live QA: an odd total was refused for every case, though only the equal split halves it
  it('needs an even total only for the two equal half-payments', () => {
    expect(createSession({ scenario: 'damage', stock: 2, totalCents: 4801 }).config.totalCents).toBe(4801);
    expect(() => createSession({ scenario: 'split', stock: 2, totalCents: 4801 })).toThrow(/even/);
  });
});
