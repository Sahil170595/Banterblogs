import { z } from 'zod';
import { fixture } from './fixtures';
import { backsClaim } from './claims';
import {
  actionSchema, configSchema, consentsTo, MAX_EVENTS, REPEAT_LIMIT, toolSchemas, VERSION, WEIGHTS_VERSION, worldSchema,
  type Action, type Event, type Result, type Session, type ToolName, type World,
} from './model';
import { score } from './reward';
export { score } from './reward';

const copy = <T,>(value: T): T => structuredClone(value);
const success = (code: string, message: string, data?: unknown): Result => ({ ok: true, code, message, ...(data === undefined ? {} : { data }) });
const failure = (code: string, message: string): Result => ({ ok: false, code, message });
const unavailable = () => failure('not_found_or_unavailable', 'That order or related record is unavailable for this account.');
const replay = () => success('idempotent_replay', 'This effect is already recorded. No second effect was created.');

export function createSession(input: unknown = {}): Session {
  const { config, world } = fixture(input);
  return { version: VERSION, config, identity: 'account-demo', initial: copy(world), world,
    events: [], repeats: {}, termination: 'open' };
}

export function refunded(world: World, paymentId: string): number {
  return world.refunds.filter(r => r.paymentId === paymentId).reduce((sum, r) => sum + r.amountCents, 0);
}

function dispatch(s: Session, action: Extract<Action, { kind: 'tool' }>): { action: Action; result: Result } {
  if (!Object.hasOwn(toolSchemas, action.name))
    return { action, result: failure('unknown_tool', 'Choose a registered service tool.') };
  const name = action.name as ToolName;
  const parsed = toolSchemas[name].safeParse(action.args);
  if (!parsed.success) return { action, result: failure('invalid_arguments', parsed.error.issues.map(i => `${i.path.join('.') || 'arguments'}: ${i.message}`).join('; ')) };
  const args = parsed.data as { orderId?: string; paymentId?: string; amountCents?: number; sku?: string };
  const normalized: Action = { ...action, args: parsed.data };
  const done = (result: Result) => ({ action: normalized, result });
  if (name === 'inventory') return done(success('inventory_found', 'Current replacement stock.', copy(s.world.inventory)));
  const order = s.world.orders.find(o => o.id === args.orderId && o.owner === s.identity);
  if (!order) return done(unavailable());
  const orderId = order.id;
  if (name === 'order') return done(success('order_found', 'Order evidence retrieved.', copy(order)));
  if (name === 'payments') return done(success('payments_found', 'Captured funds and remaining refundable balance.',
    s.world.payments.filter(p => p.orderId === orderId).map(p => ({ ...p, refundedCents: refunded(s.world, p.id), balanceCents: p.capturedCents - refunded(s.world, p.id) }))));

  const payment = s.world.payments.find(p => p.id === args.paymentId && p.orderId === orderId);
  const stock = s.world.inventory.find(p => p.sku === args.sku);
  if (name === 'refund' && !payment) return done(unavailable());
  if ((name === 'replace' || name === 'notify') && !stock)
    return done(failure('not_found_or_unavailable', 'That SKU is unavailable in the catalog.'));

  // Persisted effects, not a caller-selected key, make retries safe across dispatcher recreation.
  const refundKey = `${orderId}:${args.paymentId}:${args.amountCents}`;
  if (name === 'cancel' && order.status === 'cancelled') return done(replay());
  if (name === 'return' && s.world.returns.includes(orderId)) return done(replay());
  if (name === 'intercept' && s.world.intercepts.includes(orderId)) return done(replay());
  if (name === 'refund' && s.world.refunds.some(r => r.key === refundKey)) return done(replay());
  const existingReplacement = s.world.replacements.find(r => r.orderId === orderId);
  if (name === 'replace' && existingReplacement) return done(existingReplacement.sku === args.sku ? replay()
    : failure('policy_denied', 'This item already has a replacement. A new finish cannot create another unit.'));
  if (name === 'notify' && s.world.notifications.some(n => n.orderId === orderId && n.sku === args.sku)) return done(replay());

  if (name === 'cancel' && order.status !== 'processing')
    return done(failure('policy_denied', 'The parcel has left the warehouse. Request an intercept while shipped, or authorize a return after delivery.'));
  if (name === 'intercept' && order.status !== 'shipped')
    return done(failure('policy_denied', 'An intercept request is only available for a shipped parcel in this reduced model.'));
  if (name === 'return' && order.status !== 'delivered')
    return done(failure('policy_denied', 'A return requires a delivered item.'));
  if (name === 'refund' && payment && args.amountCents! > payment.capturedCents - refunded(s.world, payment.id))
    return done(failure('policy_denied', `Only ${payment.capturedCents - refunded(s.world, payment.id)} cents remain refundable on ${payment.id}. Reduce the amount.`));
  if (name === 'replace' && (!s.world.returns.includes(orderId) || stock!.quantity === 0))
    return done(failure('policy_denied', 'Replacement requires an authorized return and at least one available unit. Read inventory; consider a refund or stock alert.'));
  if (name === 'notify' && stock!.quantity > 0)
    return done(failure('policy_denied', 'This finish is in stock. A stock alert is not a remedy for an available item.'));

  if (!consentsTo(s.choice, normalized)) return done(failure('consent_required', 'Record the synthetic customer choice for this exact order, payment/amount or finish before writing.'));

  switch (name) {
    case 'cancel': order.status = 'cancelled'; break;
    case 'intercept': s.world.intercepts.push(orderId); break;
    case 'return': s.world.returns.push(orderId); break;
    case 'refund': s.world.refunds.push({ orderId, paymentId: args.paymentId!, amountCents: args.amountCents!, key: refundKey }); break;
    case 'replace': stock!.quantity--; s.world.replacements.push({ orderId, sku: args.sku! }); break;
    case 'notify': s.world.notifications.push({ orderId, sku: args.sku! }); break;
  }
  return done(success(`${name}_recorded`, name === 'intercept' ? 'Carrier intercept requested, not confirmed. Order remains shipped.' : `${name} effect recorded in the synthetic ledger.`));
}

function impact(action: Action | undefined, world: World): Event['impact'] {
  if (action?.kind !== 'tool' || ['order', 'payments', 'inventory'].includes(action.name)) return 'read';
  if (action.name === 'cancel' && world.orders.find(o => o.id === action.args.orderId)?.status === 'processing') return 'reversible';
  return ['return', 'notify'].includes(action.name) ? 'reversible' : 'external';
}

export function step(session: Session, input: unknown): Session {
  if (session.termination !== 'open') return session;
  const next = copy(session);
  const before = copy(next.world);
  const parsed = actionSchema.safeParse(input);
  let action = parsed.success ? parsed.data : undefined;
  let result: Result;
  if (!parsed.success) result = failure('invalid_arguments', parsed.error.issues.map(i => i.message).join('; '));
  else if (action?.kind === 'tool') {
    const dispatched = dispatch(next, action);
    action = dispatched.action;
    result = dispatched.result;
  } else if (action?.kind === 'choice') {
    const selectedOrderId = action.orderId;
    if (!next.world.orders.some(o => o.id === selectedOrderId && o.owner === next.identity)) result = unavailable();
    else { next.choice = action; next.repeats = {}; result = success('choice_recorded', 'Scripted customer choice recorded; this is not live customer dialogue.'); }
  } else if (action?.kind === 'report') {
    result = success('report_recorded', backsClaim(next.world, action.claim, action.orderId, next.identity)
      ? 'Structured report recorded with current state backing.' : 'Structured report recorded, but current state does not support it.');
  } else { next.termination = 'finished'; result = success('finished', 'Episode closed. Reset to act again.'); }

  const changed = JSON.stringify(before) !== JSON.stringify(next.world);
  // A failed handler can never publish a partial working state.
  if (!result.ok) next.world = before;
  const event: Event = { index: next.events.length + 1, input, ...(action ? { action } : {}), result,
    changed: changed && result.ok, before, after: copy(next.world), impact: impact(action, before) };
  next.events.push(event);
  if (changed) next.repeats = {};
  else if (action?.kind === 'tool') {
    const fingerprint = JSON.stringify([action, result]);
    next.repeats[fingerprint] = (next.repeats[fingerprint] ?? 0) + 1;
    if (next.repeats[fingerprint] >= REPEAT_LIMIT) next.termination = 'no_progress';
  }
  if (next.events.length >= MAX_EVENTS && next.termination === 'open') next.termination = 'budget';
  return next;
}

export function exportTrace(session: Session) {
  return { version: VERSION, weightsVersion: score(session).weightsVersion, config: session.config,
    identity: session.identity, seed: null, data: 'synthetic', initial: session.initial,
    actions: session.events.map(e => e.input), events: session.events, final: session.world,
    termination: session.termination, reward: score(session) };
}

const traceSchema = z.object({
  version: z.literal(VERSION), weightsVersion: z.literal(WEIGHTS_VERSION), config: configSchema,
  identity: z.literal('account-demo'), seed: z.null(), data: z.literal('synthetic'),
  initial: worldSchema, actions: z.array(z.unknown()).max(MAX_EVENTS),
  events: z.array(z.unknown()).max(MAX_EVENTS), final: worldSchema,
  termination: z.enum(['open', 'finished', 'no_progress', 'budget']), reward: z.unknown(),
}).strict();

export function replayTrace(input: unknown): Session {
  const trace = traceSchema.parse(input);
  const session = trace.actions.reduce<Session>((s, a) => step(s, a), createSession(trace.config));
  if (JSON.stringify(session.initial) !== JSON.stringify(trace.initial))
    throw new Error('Replay mismatch: the initial-state receipt does not match the configuration.');
  if (JSON.stringify(session.world) !== JSON.stringify(trace.final))
    throw new Error('Replay mismatch: the final-state receipt does not match the recorded actions.');
  if (session.termination !== trace.termination)
    throw new Error('Replay mismatch: the termination receipt does not match the recorded actions.');
  return session;
}
