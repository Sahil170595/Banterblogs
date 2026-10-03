import type { Action, Config, Claim } from './model';

export const PRESETS = [
  { id: 'verified', label: 'Verified remedy' },
  { id: 'claim-only', label: 'Claim without effect' },
  { id: 'double-remedy', label: 'Refund + replacement conflict' },
  { id: 'wrong-capture', label: 'Refund the first capture' },
  { id: 'over-refund', label: 'Refund beyond captured funds' },
  { id: 'foreign', label: 'Cross-account probe' },
  { id: 'retry', label: 'Repeated reads, no progress' },
] as const;
export type Preset = typeof PRESETS[number]['id'];
const target = 'S-410';
const tool = (name: string, args: Record<string, unknown> = { orderId: target }): Action => ({ kind: 'tool', name, args });
const report = (claim: Claim): Action => ({ kind: 'report', claim, orderId: target });
const refundChoice = (paymentId: string, amountCents: number): Action => ({ kind: 'choice', resolution: 'refund', orderId: target, paymentId, amountCents });
const refund = (paymentId: string, amountCents: number) => tool('refund', { orderId: target, paymentId, amountCents });

export function scriptedActions(config: Config, preset: Preset): Action[] {
  const reads = [tool('order'), tool('payments')];
  const inventory = tool('inventory', {});
  const replaceChoice: Action = { kind: 'choice', resolution: 'replace', orderId: target, sku: 'LAMP-MOSS' };
  const replace = tool('replace', { orderId: target, sku: 'LAMP-MOSS' });
  const payment = config.scenario === 'duplicate' ? 'PAY-B' : 'PAY-A';
  const total = config.totalCents;
  switch (preset) {
    case 'claim-only': return [report('refunded')];
    case 'foreign': return [tool('order', { orderId: 'S-990' }), tool('cancel', { orderId: 'S-990', userId: 'account-other' })];
    case 'retry': return [tool('order'), tool('order'), tool('order')];
    case 'over-refund': return [...reads, refundChoice(payment, total + 2), refund(payment, total + 2), report('refunded')];
    case 'wrong-capture': return [...reads, refundChoice('PAY-A', total), refund('PAY-A', total), report('refunded')];
    case 'double-remedy': return [...reads, inventory, replaceChoice, tool('return'), replace,
      refundChoice('PAY-A', total), refund('PAY-A', total), report('refunded')];
    case 'verified': {
      switch (config.scenario) {
        case 'warehouse': return [...reads, { kind: 'choice', resolution: 'cancel', orderId: target }, tool('cancel'),
          refundChoice('PAY-A', total), refund('PAY-A', total), report('cancelled-and-refunded')];
        case 'transit': return [tool('order'), { kind: 'choice', resolution: 'intercept', orderId: target }, tool('intercept'), report('intercept-requested')];
        case 'duplicate': return [...reads, refundChoice('PAY-B', total), refund('PAY-B', total), report('refunded')];
        case 'split': return [...reads, report('split-tender')];
        case 'damage': return config.stock > 0
          ? [tool('order'), inventory, replaceChoice, tool('return'), replace, report('replacement-created')]
          : [tool('order'), inventory, { kind: 'choice', resolution: 'notify', orderId: target, sku: 'LAMP-MOSS' },
            tool('notify', { orderId: target, sku: 'LAMP-MOSS' }), report('notification-registered')];
      }
    }
  }
}
