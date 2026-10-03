import { describe, expect, it } from 'vitest';
import { applyOp, reverseOp, type Shape } from './protocol';
import { BLUE, concurrentOutcomes, NOTE, undoCreation, undoOverNewer, WHITE } from './scenarios';

// The operations against sceneledger's own client tests
// (client/src/operations.test.ts), then the collaboration cases.

const rect: Shape = { id: 's1', type: 'rectangle', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000', stroke: '#000000', strokeWidth: 2 };
const other: Shape = { ...rect, id: 's2', x: 50 };

describe("sceneledger's operations", () => {
  it('add appends, update touches only its shape, delete removes', () => {
    expect(applyOp([], { kind: 'add', shape: rect }).map((s) => s.id)).toEqual(['s1']);
    const moved = applyOp([rect, other], { kind: 'update', shapeId: 's1', props: { x: 999 } });
    expect([moved[0].x, moved[0].y, moved[1].x]).toEqual([999, 20, 50]);
    expect(applyOp([rect], { kind: 'update', shapeId: 'nope', props: { x: 1 } })[0].x).toBe(10);
    expect(applyOp([rect, other], { kind: 'delete', shapeId: 's1' }).map((s) => s.id)).toEqual(['s2']);
  });

  it('reverses: add by delete, delete by a copied add, update by only the changed fields', () => {
    expect(reverseOp({ kind: 'add', shape: rect }, [])).toEqual({ kind: 'delete', shapeId: 's1' });
    const readd = reverseOp({ kind: 'delete', shapeId: 's1' }, [rect]);
    expect(readd).toEqual({ kind: 'add', shape: rect });
    expect(readd && readd.kind === 'add' && readd.shape).not.toBe(rect);
    expect(reverseOp({ kind: 'delete', shapeId: 'gone' }, [rect])).toBeNull();
    expect(reverseOp({ kind: 'update', shapeId: 's1', props: { fill: '#00ff00' } }, [rect])).toEqual({ kind: 'update', shapeId: 's1', props: { fill: '#ff0000' } });
    expect(reverseOp({ kind: 'update', shapeId: 's1', props: { x: 1, y: 2, fill: '#00ff00' } }, [rect])).toEqual({
      kind: 'update',
      shapeId: 's1',
      props: { x: 10, y: 20, fill: '#ff0000' },
    });
  });
});

describe('two people recolouring one shape at once', () => {
  it('leaves a client disagreeing with the database in 6 of 8 schedules when echoes apply as they arrive', () => {
    const outcomes = concurrentOutcomes('arrival');
    expect(outcomes).toHaveLength(8);
    expect(outcomes.filter((o) => o.outcome.diverged.length > 0)).toHaveLength(6);
    // the database always holds the colour persisted second
    for (const { schedule, outcome } of outcomes) expect(outcome.database[0].fill).toBe(schedule.serverOrder[1] === 'B' ? BLUE : '#f4d6df');
  });

  it('converges in all 8 when each client applies echoes in sequence order', () => {
    expect(concurrentOutcomes('sequence').filter((o) => o.outcome.diverged.length > 0)).toHaveLength(0);
  });
});

describe('undo against someone else’s edit, in perfect order', () => {
  it("restores the colour B replaced: B's newer edit is lost", () => {
    const { database, sent } = undoOverNewer();
    expect(database[0].fill).toBe(WHITE);
    expect(sent.at(-1)).toMatchObject({ client: 'A', undo: true });
  });

  it("deletes the note B had moved: B's move is lost with it", () => {
    const { database } = undoCreation();
    expect(database).toEqual([]);
    expect(NOTE.x).toBe(120);
  });
});
