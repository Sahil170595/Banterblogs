import { z } from 'zod';

export const FIXTURE_VERSION = 'reservation-v1';
export const SCHEMA_VERSION = 1;
export const POLL_MS = 20;
export const FIXED_WAIT_MS = 200;
export const MAX_EVENTS = 64;

const roomSchema = z.enum(['north', 'south']);
export const configSchema = z.object({
  title: z.string().max(60), room: roomSchema,
  failure: z.enum(['none', 'label-drift', 'reject-save', 'false-toast']),
  selectorPolicy: z.enum(['strict', 'fallback']), waitPolicy: z.enum(['condition', 'fixed']),
  latencyMs: z.number().int().min(100).max(2000),
  timeoutMs: z.number().int().min(100).max(3000),
  budget: z.number().int().min(1).max(8),
}).strict();
export type Config = z.infer<typeof configSchema>;
export const DEFAULT_CONFIG: Config = {
  title: 'Spectral scan', room: 'north', failure: 'none', selectorPolicy: 'fallback',
  waitPolicy: 'condition', latencyMs: 500, timeoutMs: 1500, budget: 8,
};

const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('open') }).strict(),
  z.object({ type: z.literal('fill'), value: z.string().max(60) }).strict(),
  z.object({ type: z.literal('select'), value: roomSchema }).strict(),
  z.object({ type: z.literal('submit') }).strict(),
  z.object({ type: z.literal('settle') }).strict(),
  z.object({ type: z.literal('cancel') }).strict(),
]);
export type Event = z.infer<typeof eventSchema>;
export type Phase = 'idle' | 'editing' | 'saving' | 'saved' | 'rejected' | 'cancelled';
export interface SiteState {
  phase: Phase; dialogOpen: boolean; title: string; room: Config['room'];
  toast: 'none' | 'success' | 'error';
  record: { id: string; title: string; room: Config['room'] } | null;
}
export function initialSite(): SiteState {
  return { phase: 'idle', dialogOpen: false, title: '', room: 'north', toast: 'none', record: null };
}

export function transition(state: SiteState, raw: unknown, rawConfig: unknown): SiteState {
  const event = eventSchema.parse(raw);
  const config = configSchema.parse(rawConfig);
  const editable = state.phase === 'editing' || state.phase === 'rejected';
  switch (event.type) {
    case 'open':
      if (state.dialogOpen || state.phase === 'saving') throw new Error('The reservation dialog is already active.');
      // a fresh form; a reservation already committed stays committed
      return { ...initialSite(), phase: 'editing', dialogOpen: true, record: state.record };
    case 'fill':
      if (!editable) throw new Error('Open the dialog before filling the title.');
      return { ...state, phase: 'editing', title: event.value, toast: 'none' };
    case 'select':
      if (!editable) throw new Error('Open the dialog before choosing a room.');
      return { ...state, phase: 'editing', room: event.value, toast: 'none' };
    case 'submit':
      if (!editable) throw new Error('A reservation form must be open before submitting.');
      if (state.title.trim().length < 3) throw new Error('Reservation title needs at least three non-whitespace characters.');
      return { ...state, phase: 'saving', toast: 'none' };
    case 'settle':
      if (state.phase !== 'saving') throw new Error('A save can settle only while a request is pending.');
      if (config.failure === 'reject-save') return { ...state, phase: 'rejected', toast: 'error' };
      return { ...state, phase: 'saved', dialogOpen: false, toast: 'success',
        record: config.failure === 'false-toast' ? null : { id: 'reservation-1', title: state.title.trim(), room: state.room } };
    case 'cancel':
      return { ...state, phase: 'cancelled', dialogOpen: false, toast: 'none' };
  }
}

export const snapshotSchema = z.object({
  phase: z.enum(['idle', 'editing', 'saving', 'saved', 'rejected', 'cancelled']),
  dialogOpen: z.boolean(), formValid: z.boolean().nullable(),
  inputTitle: z.string().max(60), inputRoom: roomSchema,
  recordId: z.string().max(40).nullable(), recordTitle: z.string().max(60).nullable(), recordRoom: roomSchema.nullable(),
  toast: z.enum(['none', 'success', 'error']), roles: z.array(z.string().max(160)).max(24),
}).strict();
export type Snapshot = z.infer<typeof snapshotSchema>;

export function observeModel(state: SiteState): Snapshot {
  return {
    phase: state.phase, dialogOpen: state.dialogOpen,
    formValid: state.dialogOpen ? state.title.trim().length >= 3 : null,
    inputTitle: state.title, inputRoom: state.room,
    recordId: state.record?.id ?? null, recordTitle: state.record?.title ?? null, recordRoom: state.record?.room ?? null,
    toast: state.toast,
    roles: ['button:Reserve slot', ...(state.dialogOpen ? ['dialog:Reservation', 'textbox:Reservation title', 'combobox:Room', 'button:Save reservation'] : []), ...(state.toast !== 'none' ? [`status:${state.toast}`] : []), ...(state.record ? [`row:${state.record.title}`] : [])],
  };
}
export interface Condition { label: string; met: boolean }
export function completion(raw: unknown, rawConfig: unknown): { complete: boolean; conditions: Condition[] } {
  const state = snapshotSchema.parse(raw);
  const config = configSchema.parse(rawConfig);
  const conditions = [
    { label: 'Committed record exists', met: Boolean(state.recordId) },
    { label: 'Title matches the requested task', met: config.title.trim().length >= 3 && state.recordTitle === config.title.trim() },
    { label: 'Room matches the requested task', met: state.recordRoom === config.room },
    { label: 'Save reached its completed state', met: state.phase === 'saved' },
    { label: 'Dialog is closed', met: !state.dialogOpen },
    { label: 'Success notice is present', met: state.toast === 'success' },
  ];
  return { complete: conditions.every(condition => condition.met), conditions };
}

export interface PlanStep { kind: 'open' | 'fill' | 'select' | 'submit' | 'wait'; label: string; target: string; value?: string }
export function planFor(raw: unknown): PlanStep[] {
  const config = configSchema.parse(raw);
  return [
    { kind: 'open', label: 'Open reservation dialog', target: 'button[Reserve slot]' },
    { kind: 'fill', label: 'Fill task title', target: 'textbox[Reservation title]', value: config.title },
    { kind: 'select', label: 'Choose a room', target: 'combobox[Room]', value: config.room },
    { kind: 'submit', label: 'Submit reservation form', target: 'button[Save reservation]' },
    { kind: 'wait', label: 'Verify committed reservation', target: config.waitPolicy === 'condition' ? 'all completion conditions' : `fixed delay: ${FIXED_WAIT_MS} ms` },
  ];
}

export interface FixturePort {
  read(): Snapshot;
  click(name: string): boolean;
  fill(value: string): void;
  select(value: Config['room']): void;
  submit(): void;
  cancelPending(): void;
}
export interface TraceEntry {
  index: number; action: PlanStep; status: 'ok' | 'failed' | 'cancelled';
  reason: string; elapsedMs: number; before: Snapshot; after: Snapshot;
  roleDelta: number; changed: boolean;
}
export interface Trace {
  config: Config; cursor: number; entries: TraceEntry[];
  status: 'ready' | 'running' | 'complete' | 'failed' | 'cancelled' | 'budget-exhausted';
  conditions: Condition[];
  finalObservation: Snapshot | null;
}
export function startTrace(raw: unknown = DEFAULT_CONFIG): Trace {
  const config = configSchema.parse(raw);
  return { config, cursor: 0, entries: [], status: 'ready', finalObservation: null, conditions: completion(observeModel(initialSite()), config).conditions };
}
export function roleDistance(before: string[], after: string[]): number {
  const a = new Set(before), b = new Set(after);
  const union = new Set([...a, ...b]);
  return union.size ? 1 - [...a].filter(role => b.has(role)).length / union.size : 0;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Workflow cancelled.')); return; }
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new Error('Workflow cancelled.')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

async function awaitCondition(port: FixturePort, config: Config, predicate: (state: Snapshot) => boolean, signal?: AbortSignal) {
  const start = Date.now();
  while (!predicate(snapshotSchema.parse(port.read()))) {
    if (signal?.aborted) throw new Error('Workflow cancelled.');
    const state = port.read();
    if (state.phase === 'rejected') throw new Error('The synthetic save was rejected.');
    if (state.phase === 'saved' && !state.recordId) throw new Error('Success notice appeared without a committed record.');
    if (Date.now() - start >= config.timeoutMs) throw new Error(`Condition timeout after ${config.timeoutMs} ms.`);
    await delay(Math.min(POLL_MS, config.timeoutMs - (Date.now() - start)), signal);
  }
}

export async function stepWorkflow(trace: Trace, port: FixturePort, signal?: AbortSignal): Promise<Trace> {
  if (!['ready', 'running'].includes(trace.status)) return trace;
  const config = configSchema.parse(trace.config);
  const observed = snapshotSchema.parse(port.read());
  const existingGoal = completion(observed, config);
  if (existingGoal.complete) return { ...trace, status: 'complete', conditions: existingGoal.conditions, finalObservation: observed };
  if (trace.cursor >= config.budget) {
    port.cancelPending(); await delay(0);
    const finalObservation = snapshotSchema.parse(port.read());
    return { ...trace, status: 'budget-exhausted', finalObservation, conditions: completion(finalObservation, config).conditions };
  }
  const plan = planFor(config);
  const action = plan[trace.cursor];
  if (!action) throw new Error('Trace cursor is outside the action plan.');
  const before = snapshotSchema.parse(port.read());
  const start = Date.now();
  let status: TraceEntry['status'] = 'ok';
  let reason = 'Action executed; evidence sampled from the fixture.';
  try {
    if (signal?.aborted) throw new Error('Workflow cancelled.');
    switch (action.kind) {
      case 'open': {
        let found = port.click('Reserve slot');
        if (!found && config.selectorPolicy === 'fallback') {
          found = port.click('New reservation');
          if (found) reason = 'Known accessible-name alias used: New reservation.';
        }
        if (!found) throw new Error('Button Reserve slot was not found or was disabled.');
        await awaitCondition(port, config, state => state.dialogOpen, signal);
        break;
      }
      case 'fill': port.fill(config.title); break;
      case 'select': port.select(config.room); break;
      case 'submit': port.submit(); break;
      case 'wait':
        if (config.waitPolicy === 'fixed') {
          await delay(FIXED_WAIT_MS, signal);
          if (!completion(port.read(), config).complete) throw new Error('Fixed wait elapsed before required completion conditions.');
        } else await awaitCondition(port, config, state => completion(state, config).complete, signal);
        break;
    }
    await delay(0, signal);
  } catch (cause) {
    status = signal?.aborted ? 'cancelled' : 'failed';
    reason = cause instanceof Error ? cause.message : 'Workflow action failed.';
    port.cancelPending(); await delay(0);
  }
  const after = snapshotSchema.parse(port.read());
  const gate = completion(after, config);
  const cursor = trace.cursor + 1;
  const entry: TraceEntry = {
    index: trace.cursor, action, status, reason, before, after,
    elapsedMs: Date.now() - start, roleDelta: roleDistance(before.roles, after.roles), changed: JSON.stringify(before) !== JSON.stringify(after),
  };
  return {
    config, cursor, entries: [...trace.entries, entry], conditions: gate.conditions, finalObservation: after,
    status: status !== 'ok' ? status : cursor === plan.length ? gate.complete ? 'complete' : 'failed' : 'running',
  };
}

export async function runWorkflow(trace: Trace, port: FixturePort, signal?: AbortSignal, onStep?: (trace: Trace) => void): Promise<Trace> {
  let current = trace;
  while (['ready', 'running'].includes(current.status)) {
    current = await stepWorkflow(current, port, signal);
    onStep?.(current);
  }
  return current;
}

export function replayExport(raw: unknown) {
  const envelope = z.object({
    schemaVersion: z.literal(SCHEMA_VERSION), fixtureVersion: z.literal(FIXTURE_VERSION),
    config: configSchema, events: z.array(eventSchema).max(MAX_EVENTS),
  }).passthrough().parse(raw);
  const frames: SiteState[] = [initialSite()];
  for (const event of envelope.events) frames.push(transition(frames[frames.length - 1], event, envelope.config));
  return { config: envelope.config, frames, completion: completion(observeModel(frames[frames.length - 1]), envelope.config) };
}
