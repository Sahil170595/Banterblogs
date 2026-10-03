import type { Claim, World } from './model';

export function backsClaim(world: World, claim: Claim, orderId: string, identity: string): boolean {
  const order = world.orders.find(o => o.id === orderId && o.owner === identity);
  if (claim === 'unavailable') return !order;
  if (!order) return false;
  const totalRefunded = world.refunds.filter(r => r.orderId === orderId).reduce((n, r) => n + r.amountCents, 0);
  switch (claim) {
    case 'cancelled-and-refunded': return order.status === 'cancelled' && totalRefunded === order.totalCents;
    case 'cancelled': return order.status === 'cancelled';
    case 'refunded': return totalRefunded > 0;
    case 'intercept-requested': return world.intercepts.includes(orderId);
    case 'replacement-created': return world.replacements.some(r => r.orderId === orderId);
    case 'notification-registered': return world.notifications.some(n => n.orderId === orderId);
    case 'split-tender': {
      const p = world.payments.filter(p => p.orderId === orderId);
      return p.length === 2 && p.every(p => p.capturedCents === order.totalCents / 2)
        && new Set(p.map(p => p.processorRef)).size === 2;
    }
    case 'no-action': return totalRefunded === 0 && !world.returns.includes(orderId)
      && !world.replacements.some(r => r.orderId === orderId) && !world.intercepts.includes(orderId)
      && !world.notifications.some(n => n.orderId === orderId) && order.status !== 'cancelled';
  }
}
