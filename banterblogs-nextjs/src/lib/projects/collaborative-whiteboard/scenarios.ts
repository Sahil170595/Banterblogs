import { allSchedules, runSchedule, runSequential, type ApplyMode, type Client, type Op, type Shape, type Step } from './protocol';

// The collaboration cases the page shows: two people recolouring one shape at
// once, and two undo cases the source's own documentation names.

export const WHITE = '#ffffff';
export const ROSE = '#f4d6df';
export const BLUE = '#dae9fc';

export const NOTE: Shape = { id: 'note', type: 'rectangle', x: 120, y: 120, width: 200, height: 120, fill: WHITE, stroke: '#25343c', strokeWidth: 2 };

export const CONCURRENT_SENDS: Record<Client, Op> = {
  A: { kind: 'update', shapeId: NOTE.id, props: { fill: ROSE } },
  B: { kind: 'update', shapeId: NOTE.id, props: { fill: BLUE } },
};

export function concurrentOutcomes(mode: ApplyMode) {
  return allSchedules().map((schedule) => ({ schedule, outcome: runSchedule([NOTE], CONCURRENT_SENDS, schedule, mode) }));
}

/** A recolours, B recolours after, A undoes: A's undo restores the colour B replaced */
export const UNDO_OVER_NEWER: Step[] = [
  { client: 'A', op: { kind: 'update', shapeId: NOTE.id, props: { fill: ROSE } } },
  { client: 'B', op: { kind: 'update', shapeId: NOTE.id, props: { fill: BLUE } } },
  { client: 'A', undo: true },
];

/** A adds the note, B moves it, A undoes the add: the note goes, and B's move with it */
export const UNDO_CREATION: Step[] = [
  { client: 'A', op: { kind: 'add', shape: NOTE } },
  { client: 'B', op: { kind: 'update', shapeId: NOTE.id, props: { x: 420, y: 260 } } },
  { client: 'A', undo: true },
];

export const undoOverNewer = () => runSequential([NOTE], UNDO_OVER_NEWER);
export const undoCreation = () => runSequential([], UNDO_CREATION);
