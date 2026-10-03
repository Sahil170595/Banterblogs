// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Sahil Kadadekar. Adapted immutable operations; see NOTICE.txt.
import { z } from 'zod';

export const BOARD_WIDTH = 960;
export const BOARD_HEIGHT = 600;
export const MIN_SIZE = 12;
export const MAX_SHAPES = 200;
export const MAX_ENTRIES = 1000;
export const MAX_TRACE_BYTES = 1_000_000;
export const TRACE_VERSION = 'whiteboard.trace.v1';
export const CONFIGURATION = { width: BOARD_WIDTH, height: BOARD_HEIGHT, fixtureRevision: 'synthetic-workflow-v1' } as const;

const coordinate = z.number().finite();
const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a six-digit hex color.');
const properties = {
  x: coordinate, y: coordinate, width: coordinate, height: coordinate,
  fill: color, stroke: color, strokeWidth: z.number().finite().min(1).max(8),
  text: z.string().max(300).optional(), fontSize: z.number().finite().min(12).max(48).optional(),
};
const shapeSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  type: z.enum(['rectangle', 'ellipse', 'line', 'text']), ...properties,
}).strict().superRefine((shape, ctx) => {
  const line = shape.type === 'line';
  const left = Math.min(shape.x, shape.x + shape.width);
  const top = Math.min(shape.y, shape.y + shape.height);
  const right = Math.max(shape.x, shape.x + shape.width);
  const bottom = Math.max(shape.y, shape.y + shape.height);
  if (left < 0 || top < 0 || right > BOARD_WIDTH || bottom > BOARD_HEIGHT) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Keep the entire shape inside the 960 by 600 board.' });
  }
  if (line ? Math.hypot(shape.width, shape.height) < MIN_SIZE : shape.width < MIN_SIZE || shape.height < MIN_SIZE) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Shapes must be at least 12 board units; lines need length 12.' });
  }
  if (shape.type === 'text' && (!shape.text?.trim() || shape.fontSize === undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Text objects need nonempty text and a font size.' });
  }
});
export type Shape = z.infer<typeof shapeSchema>;
export type ShapeType = Shape['type'];
const patchSchema = z.object(properties).partial().strict();
export type ShapePatch = z.infer<typeof patchSchema>;
const operationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('add'), shape: shapeSchema, index: z.number().int().nonnegative().optional() }).strict(),
  z.object({ kind: z.literal('update'), shapeId: z.string(), props: patchSchema }).strict(),
  z.object({ kind: z.literal('delete'), shapeId: z.string() }).strict(),
]);
export type Operation = z.infer<typeof operationSchema>;
type HistoryEntry = { forward: Operation[]; reverse: Operation[] };
const entrySchema = z.object({
  seq: z.number().int().positive(), action: z.enum(['edit', 'clear', 'undo', 'redo']),
  operations: z.array(operationSchema).min(1).max(MAX_SHAPES),
}).strict();
export type LogEntry = z.infer<typeof entrySchema>;
export interface BoardState {
  initialShapes: Shape[];
  shapes: Shape[];
  undo: HistoryEntry[];
  redo: HistoryEntry[];
  log: LogEntry[];
}
const traceSchema = z.object({
  schemaVersion: z.literal(TRACE_VERSION), runtime: z.literal('browser-application'), mode: z.literal('local-single-tab'),
  configuration: z.object({ width: z.literal(BOARD_WIDTH), height: z.literal(BOARD_HEIGHT), fixtureRevision: z.literal('synthetic-workflow-v1') }).strict(),
  initialShapes: z.array(shapeSchema).max(MAX_SHAPES), entries: z.array(entrySchema).max(MAX_ENTRIES),
  shapes: z.array(shapeSchema).max(MAX_SHAPES),
}).strict();
export type BoardTrace = z.infer<typeof traceSchema>;

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues.map((issue) => `${issue.path.join('.') || 'Input'}: ${issue.message}`).join('; '));
  return result.data;
}
export function parseShape(input: unknown): Shape { return parse(shapeSchema, input); }
function equal(a: unknown, b: unknown): boolean { return JSON.stringify(a) === JSON.stringify(b); }

export function createBoard(input: readonly Shape[]): BoardState {
  const shapes = parse(z.array(shapeSchema).max(MAX_SHAPES), input);
  if (new Set(shapes.map((shape) => shape.id)).size !== shapes.length) throw new Error('Shape IDs must be unique.');
  return { initialShapes: structuredClone(shapes), shapes, undo: [], redo: [], log: [] };
}

export function applyOp(shapes: readonly Shape[], input: Operation): Shape[] {
  const op = parse(operationSchema, input);
  if (op.kind === 'add') {
    if (shapes.some((shape) => shape.id === op.shape.id)) throw new Error(`Shape ${op.shape.id} already exists.`);
    if (shapes.length >= MAX_SHAPES) throw new Error('Board limit reached: remove an object before adding another.');
    const index = op.index ?? shapes.length;
    if (index > shapes.length) throw new Error('Insertion position is outside the current object list.');
    return [...shapes.slice(0, index), op.shape, ...shapes.slice(index)];
  }
  if (!shapes.some((shape) => shape.id === op.shapeId)) throw new Error(`Shape ${op.shapeId} not found.`);
  if (op.kind === 'delete') return shapes.filter((shape) => shape.id !== op.shapeId);
  return shapes.map((shape) => shape.id === op.shapeId ? parseShape({ ...shape, ...op.props }) : shape);
}

export function reverseOp(input: Operation, shapes: readonly Shape[]): Operation {
  const op = parse(operationSchema, input);
  if (op.kind === 'add') return { kind: 'delete', shapeId: op.shape.id };
  const index = shapes.findIndex((shape) => shape.id === op.shapeId);
  const shape = shapes[index];
  if (!shape) throw new Error(`Shape ${op.shapeId} not found.`);
  if (op.kind === 'delete') return { kind: 'add', shape: { ...shape }, index };
  const props: ShapePatch = {};
  for (const key of Object.keys(op.props) as (keyof ShapePatch)[]) {
    if (op.props[key] !== undefined) {
      // Optional text/font fields are only edited on text objects, where both are present.
      if (shape[key] === undefined) throw new Error(`Cannot invert an absent property: ${key}.`);
      Object.assign(props, { [key]: shape[key] });
    }
  }
  return { kind: 'update', shapeId: shape.id, props };
}

function append(state: BoardState, shapes: Shape[], action: LogEntry['action'], operations: Operation[]): LogEntry[] {
  if (state.log.length >= MAX_ENTRIES) throw new Error('Trace limit reached. Export your work, then reset for a new session.');
  const log = [...state.log, { seq: state.log.length + 1, action, operations: structuredClone(operations) }];
  exportTrace({ ...state, shapes, log });
  return log;
}

export function commit(state: BoardState, inputs: Operation[], action: 'edit' | 'clear' = 'edit'): BoardState {
  if (inputs.length > MAX_SHAPES) throw new Error('Too many operations in one command.');
  let shapes = state.shapes;
  const forward: Operation[] = [];
  const reverse: Operation[] = [];
  for (const input of inputs) {
    const op = parse(operationSchema, input);
    const inverse = reverseOp(op, shapes);
    const next = applyOp(shapes, op);
    if (!equal(next, shapes)) {
      forward.push(op);
      reverse.unshift(inverse);
      shapes = next;
    }
  }
  if (!forward.length) return state;
  return { ...state, shapes, undo: [...state.undo, { forward, reverse }], redo: [], log: append(state, shapes, action, forward) };
}
export function clearBoard(state: BoardState): BoardState {
  return commit(state, state.shapes.map((shape) => ({ kind: 'delete', shapeId: shape.id })), 'clear');
}
export function undo(state: BoardState): BoardState {
  const entry = state.undo.at(-1);
  if (!entry) return state;
  const shapes = entry.reverse.reduce((current, op) => applyOp(current, op), state.shapes);
  return { ...state, shapes, undo: state.undo.slice(0, -1), redo: [...state.redo, entry], log: append(state, shapes, 'undo', entry.reverse) };
}
export function redo(state: BoardState): BoardState {
  const entry = state.redo.at(-1);
  if (!entry) return state;
  const shapes = entry.forward.reduce((current, op) => applyOp(current, op), state.shapes);
  return { ...state, shapes, undo: [...state.undo, entry], redo: state.redo.slice(0, -1), log: append(state, shapes, 'redo', entry.forward) };
}
export function exportTrace(state: BoardState): BoardTrace {
  const trace: BoardTrace = { schemaVersion: TRACE_VERSION, runtime: 'browser-application', mode: 'local-single-tab', configuration: CONFIGURATION, initialShapes: state.initialShapes, entries: state.log, shapes: state.shapes };
  if (new TextEncoder().encode(JSON.stringify(trace, null, 2)).byteLength > MAX_TRACE_BYTES) {
    throw new Error('Trace size limit reached. Export your work, then reset for a new session.');
  }
  return structuredClone(trace);
}
export function restoreTrace(input: unknown): BoardState {
  const trace = parse(traceSchema, input);
  let state = createBoard(trace.initialShapes);
  for (const entry of trace.entries) {
    if (entry.seq !== state.log.length + 1) throw new Error('Trace sequence must start at 1 and have no gaps.');
    const previousLength = state.log.length;
    state = entry.action === 'undo' ? undo(state) : entry.action === 'redo' ? redo(state) : entry.action === 'clear' ? clearBoard(state) : commit(state, entry.operations);
    if (state.log.length !== previousLength + 1 || !equal(state.log.at(-1), entry)) throw new Error('Trace history does not match the expected operations or inverses.');
  }
  if (!equal(state.shapes, trace.shapes)) throw new Error('Trace final state does not match replay.');
  return state;
}
