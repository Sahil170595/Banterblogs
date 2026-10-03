import { describe, expect, it } from 'vitest';
import {
  applyOp, clearBoard, commit, createBoard, exportTrace, MAX_TRACE_BYTES, parseShape,
  redo, restoreTrace, reverseOp, undo, type Shape,
} from './engine';
import { clampMove, hitTest, makeShape, resizeShape } from './geometry';
import { INITIAL_SHAPES } from './fixtures';

const rectangle: Shape = {
  id: 'test-rect', type: 'rectangle', x: 100, y: 100, width: 160, height: 100,
  fill: '#cfeee2', stroke: '#175e50', strokeWidth: 2,
};
const second: Shape = { ...rectangle, id: 'second', x: 150, y: 130 };

describe('immutable operations and inverses', () => {
  it('updates only requested fields without mutating the input', () => {
    const before = structuredClone(rectangle);
    const result = applyOp([rectangle], { kind: 'update', shapeId: rectangle.id, props: { x: 200 } });
    expect(result[0]).toEqual({ ...before, x: 200 });
    expect(rectangle).toEqual(before);
  });
  it('builds a field-level inverse, not a board snapshot', () => {
    expect(reverseOp({ kind: 'update', shapeId: rectangle.id, props: { x: 200, fill: '#ffffff' } }, [rectangle]))
      .toEqual({ kind: 'update', shapeId: rectangle.id, props: { x: 100, fill: '#cfeee2' } });
  });
  it('restores a deleted object at its original z-position', () => {
    const op = { kind: 'delete', shapeId: rectangle.id } as const;
    const inverse = reverseOp(op, [rectangle, second]);
    expect(applyOp(applyOp([rectangle, second], op), inverse)).toEqual([rectangle, second]);
  });
  it('rejects missing targets, duplicate IDs, and forged identity patches', () => {
    expect(() => applyOp([rectangle], { kind: 'delete', shapeId: 'absent' })).toThrow(/not found/i);
    expect(() => applyOp([rectangle], { kind: 'add', shape: rectangle })).toThrow(/already exists/i);
    expect(() => applyOp([rectangle], JSON.parse('{"kind":"update","shapeId":"test-rect","props":{"id":"forged"}}'))).toThrow();
  });
});

describe('history, replay and reset', () => {
  it('undoes and redoes a drag with the exact original properties', () => {
    const initial = createBoard([rectangle]);
    const moved = commit(initial, [{ kind: 'update', shapeId: rectangle.id, props: { x: 300, y: 220 } }]);
    const reversed = undo(moved);
    expect(reversed.shapes).toEqual(initial.shapes);
    expect(redo(reversed).shapes).toEqual(moved.shapes);
    expect(redo(reversed).log.map((entry) => entry.action)).toEqual(['edit', 'undo', 'redo']);
  });
  it('makes clear one undoable atomic command, preserving object order', () => {
    const initial = createBoard([rectangle, second]);
    const cleared = clearBoard(initial);
    expect(cleared.shapes).toEqual([]);
    expect(cleared.undo).toHaveLength(1);
    expect(undo(cleared).shapes).toEqual(initial.shapes);
    expect(redo(undo(cleared)).shapes).toEqual([]);
  });
  it('does not record no-op updates or consume empty undo/redo stacks', () => {
    const initial = createBoard([rectangle]);
    expect(commit(initial, [{ kind: 'update', shapeId: rectangle.id, props: { x: 100 } }])).toBe(initial);
    expect(undo(initial)).toBe(initial);
    expect(redo(initial)).toBe(initial);
    expect(clearBoard(createBoard([])).log).toHaveLength(0);
  });
  it('invalidates redo after a new edit', () => {
    const moved = commit(createBoard([rectangle]), [{ kind: 'update', shapeId: rectangle.id, props: { x: 300 } }]);
    const alternate = commit(undo(moved), [{ kind: 'update', shapeId: rectangle.id, props: { y: 250 } }]);
    expect(alternate.redo).toEqual([]);
    expect(redo(alternate)).toBe(alternate);
  });
  it('rejects an entire batch when a later operation is invalid', () => {
    const initial = createBoard([rectangle]);
    expect(() => commit(initial, [
      { kind: 'update', shapeId: rectangle.id, props: { x: 200 } },
      { kind: 'delete', shapeId: 'missing' },
    ])).toThrow();
    expect(initial.shapes).toEqual([rectangle]);
    expect(initial.log).toEqual([]);
  });
  it('exports and restores history, including clear/undo/redo', () => {
    const state = redo(undo(clearBoard(commit(createBoard([rectangle, second]), [
      { kind: 'update', shapeId: second.id, props: { y: 250 } },
    ]))));
    const trace = JSON.parse(JSON.stringify(exportTrace(state)));
    expect(restoreTrace(trace)).toEqual(state);
    expect(trace.mode).toBe('local-single-tab');
    expect(trace.configuration).toEqual({ width: 960, height: 600, fixtureRevision: 'synthetic-workflow-v1' });
  });
  it('rejects tampered final state, sequence gaps, inverse operations and schemas', () => {
    const state = undo(commit(createBoard([rectangle]), [{ kind: 'update', shapeId: rectangle.id, props: { x: 200 } }]));
    const altered = structuredClone(exportTrace(state));
    altered.shapes[0].x = 150;
    expect(() => restoreTrace(altered)).toThrow(/final state/i);
    const sequence = structuredClone(exportTrace(state));
    sequence.entries[0].seq = 4;
    expect(() => restoreTrace(sequence)).toThrow(/sequence/i);
    const inverse = structuredClone(exportTrace(state));
    inverse.entries[1].operations = [{ kind: 'delete', shapeId: rectangle.id }];
    expect(() => restoreTrace(inverse)).toThrow(/history/i);
    expect(() => restoreTrace({ ...exportTrace(state), schemaVersion: 'unknown' })).toThrow();
  });
  it('reset creates independent synthetic state rather than retaining history', () => {
    const initial = createBoard(INITIAL_SHAPES);
    const changed = clearBoard(initial);
    expect(createBoard(INITIAL_SHAPES)).toEqual(initial);
    expect(changed.shapes).toEqual([]);
    expect(INITIAL_SHAPES.length).toBeGreaterThan(0);
  });
  it('rejects history growth before an export exceeds the file-import limit', () => {
    let state = createBoard(Array.from({ length: 200 }, (_, index) => ({ ...rectangle, id: `shape-${index}`, text: 'A'.repeat(300) })));
    let rejected = false;
    for (let index = 0; index < 1000; index++) {
      const before = state;
      try { state = index % 2 === 0 ? clearBoard(state) : undo(state); }
      catch (error) {
        expect(String(error)).toMatch(/export/i);
        expect(state).toBe(before);
        rejected = true;
        break;
      }
    }
    expect(rejected).toBe(true);
    const exported = JSON.stringify(exportTrace(state), null, 2);
    expect(new TextEncoder().encode(exported).byteLength).toBeLessThanOrEqual(MAX_TRACE_BYTES);
    expect(restoreTrace(JSON.parse(exported))).toEqual(state);
  });
});

describe('input validation', () => {
  it.each([NaN, Infinity, -Infinity])('rejects nonfinite coordinates: %s', (x) => {
    expect(() => parseShape({ ...rectangle, x })).toThrow();
  });
  it('rejects off-board objects, invalid colors, unknown types and zero-size shapes', () => {
    for (const patch of [{ x: -1 }, { width: 1000 }, { fill: 'url(javascript:bad)' }, { type: 'image' }, { height: 0 }]) {
      expect(() => parseShape({ ...rectangle, ...patch })).toThrow();
    }
  });
  it('rejects duplicate fixture IDs and accepts signed line dimensions', () => {
    expect(() => createBoard([rectangle, rectangle])).toThrow(/unique/i);
    expect(parseShape({ ...rectangle, type: 'line', width: -80, height: -30 }).width).toBe(-80);
  });
});

describe('geometry adapted from the whiteboard client', () => {
  it('hits the topmost object, except the selected object rendered above it', () => {
    expect(hitTest([rectangle, second], 180, 160)?.id).toBe(second.id);
    expect(hitTest([rectangle, second], 180, 160, rectangle.id)?.id).toBe(rectangle.id);
    expect(hitTest([rectangle], 700, 450)).toBeNull();
  });
  it('distinguishes ellipse bounds from rectangle bounds', () => {
    const ellipse = { ...rectangle, type: 'ellipse' as const };
    expect(hitTest([ellipse], 180, 150)?.id).toBe(ellipse.id);
    expect(hitTest([ellipse], 100, 100)).toBeNull();
  });
  it('uses segment distance, including reversed and degenerate lines', () => {
    const line = { ...rectangle, type: 'line' as const, width: -80, height: -80 };
    expect(hitTest([line], 60, 60)?.id).toBe(line.id);
    expect(hitTest([line], 60, 90)).toBeNull();
    expect(hitTest([{ ...line, width: 0, height: 0 }], 100, 100)?.id).toBe(line.id);
  });
  it('normalizes drawn rectangles but preserves line direction', () => {
    expect(makeShape('rectangle', { x: 250, y: 250 }, { x: 150, y: 160 }, 'new', '#cfeee2'))
      .toMatchObject({ x: 150, y: 160, width: 100, height: 90 });
    expect(makeShape('line', { x: 250, y: 250 }, { x: 150, y: 160 }, 'new', '#cfeee2'))
      .toMatchObject({ x: 250, y: 250, width: -100, height: -90 });
  });
  it('clamps movement using both endpoints for signed lines', () => {
    const line = { ...rectangle, type: 'line' as const, width: -80, height: -30 };
    expect(clampMove(line, -500, -500)).toEqual({ x: 80, y: 30 });
    expect(clampMove(rectangle, 1000, 1000)).toEqual({ x: 800, y: 500 });
  });
  it('resizes from a handle and enforces minimum dimensions', () => {
    expect(resizeShape(rectangle, 'se', { x: 310, y: 240 })).toMatchObject({ width: 210, height: 140 });
    expect(resizeShape(rectangle, 'se', { x: 90, y: 90 })).toMatchObject({ width: 12, height: 12 });
  });
});
