// Sceneledger's collaboration path, as a deterministic model: the client's
// operations (client/src/operations.ts), its handling of server echoes
// (client/src/components/CanvasPage.tsx) and the server's op handling
// (server/app/ws.py). The server persists each op under a per-canvas lock,
// numbers it, then broadcasts outside the lock, so two clients can receive
// the same two ops in different orders; the client applies echoes in arrival
// order and only records the sequence number.

export interface Shape {
  id: string;
  type: 'rectangle' | 'ellipse' | 'line' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
}
export type ShapePatch = Partial<Omit<Shape, 'id' | 'type'>>;
export type Op = { kind: 'add'; shape: Shape } | { kind: 'update'; shapeId: string; props: ShapePatch } | { kind: 'delete'; shapeId: string };

/** operations.ts applyOp: add appends, update merges, delete filters */
export function applyOp(shapes: Shape[], op: Op): Shape[] {
  switch (op.kind) {
    case 'add':
      return [...shapes, op.shape];
    case 'update':
      return shapes.map((s) => (s.id === op.shapeId ? { ...s, ...op.props } : s));
    case 'delete':
      return shapes.filter((s) => s.id !== op.shapeId);
  }
}

/** operations.ts reverseOp: the undo for an op, from the scene it is about to change */
export function reverseOp(op: Op, shapes: Shape[]): Op | null {
  switch (op.kind) {
    case 'add':
      return { kind: 'delete', shapeId: op.shape.id };
    case 'delete': {
      const shape = shapes.find((s) => s.id === op.shapeId);
      return shape ? { kind: 'add', shape: { ...shape } } : null;
    }
    case 'update': {
      const shape = shapes.find((s) => s.id === op.shapeId);
      if (!shape) return null;
      const props: Record<string, unknown> = {};
      for (const key of Object.keys(op.props) as (keyof ShapePatch)[]) if (op.props[key] !== undefined) props[key] = shape[key];
      return { kind: 'update', shapeId: op.shapeId, props: props as ShapePatch };
    }
  }
}

export type Client = 'A' | 'B';
export const CLIENTS: Client[] = ['A', 'B'];

export interface Message {
  seq: number;
  op: Op;
  from: Client;
}

/** how a client applies the server's echoes */
export type ApplyMode = 'arrival' | 'sequence';

/**
 * One schedule of two concurrent sends: each client applies its own op at
 * once, the server persists them in `serverOrder` and numbers them, and each
 * client receives both echoes in its own order.
 */
export interface Schedule {
  serverOrder: Client[];
  /** for each client, the sequence numbers in the order they arrive */
  arrival: Record<Client, number[]>;
}

export interface Outcome {
  database: Shape[];
  scenes: Record<Client, Shape[]>;
  /** clients whose scene differs from the database */
  diverged: Client[];
}

export function runSchedule(initial: Shape[], sends: Record<Client, Op>, schedule: Schedule, mode: ApplyMode): Outcome {
  const scenes = { A: applyOp(initial, sends.A), B: applyOp(initial, sends.B) } as Record<Client, Shape[]>;
  let database = initial;
  const messages: Message[] = schedule.serverOrder.map((from, i) => {
    database = applyOp(database, sends[from]);
    return { seq: i + 1, op: sends[from], from };
  });
  for (const client of CLIENTS) {
    const order = mode === 'arrival' ? schedule.arrival[client] : [...schedule.arrival[client]].sort((a, b) => a - b);
    for (const seq of order) {
      const message = messages[seq - 1];
      // the client skips only its own add echoes; everything else re-applies
      if (message.from === client && message.op.kind === 'add') continue;
      scenes[client] = applyOp(scenes[client], message.op);
    }
  }
  const same = (a: Shape[], b: Shape[]) => JSON.stringify(a) === JSON.stringify(b);
  return { database, scenes, diverged: CLIENTS.filter((c) => !same(scenes[c], database)) };
}

/** every server order and every arrival order at each client, for one send each */
export function allSchedules(): Schedule[] {
  const orders: [number, number][] = [
    [1, 2],
    [2, 1],
  ];
  const schedules: Schedule[] = [];
  for (const serverOrder of [['A', 'B'] as Client[], ['B', 'A'] as Client[]])
    for (const a of orders) for (const b of orders) schedules.push({ serverOrder, arrival: { A: a, B: b } });
  return schedules;
}

/**
 * Sequential collaboration with undo: each step's op reaches the server and
 * every client before the next step, the most favourable ordering there is.
 */
export type Step = { client: Client; op: Op } | { client: Client; undo: true };

export function runSequential(initial: Shape[], steps: Step[]): { database: Shape[]; sent: { client: Client; op: Op; undo: boolean }[] } {
  let database = initial;
  const undoStacks: Record<Client, Op[]> = { A: [], B: [] };
  const sent: { client: Client; op: Op; undo: boolean }[] = [];
  for (const step of steps) {
    let op: Op;
    if ('undo' in step) {
      const reverse = undoStacks[step.client].pop();
      if (!reverse) continue;
      op = reverse;
    } else {
      // the client computes the inverse from its scene before sending
      const reverse = reverseOp(step.op, database);
      if (reverse) undoStacks[step.client].push(reverse);
      op = step.op;
    }
    database = applyOp(database, op);
    sent.push({ client: step.client, op, undo: 'undo' in step });
  }
  return { database, sent };
}
