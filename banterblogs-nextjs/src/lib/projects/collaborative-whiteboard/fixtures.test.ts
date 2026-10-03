import { describe, expect, it } from 'vitest';
import { INITIAL_SHAPES } from './fixtures';
import { bounds, HIT_MARGIN } from './geometry';
import type { Shape } from './engine';

// The model has no groups and no connectors, so the opening board must not
// look as if it had them: a label drawn on a box, or a line ending at a
// shape, is left behind the first time the box is dragged.

// a line end this close to a shape reads as attached to it
const ATTACHED_DISTANCE = 24;

const box = (shape: Shape, margin: number) => {
  const b = bounds(shape);
  return { left: b.left - margin, top: b.top - margin, right: b.right + margin, bottom: b.bottom + margin };
};

describe('the opening board', () => {
  it('puts no object on top of another', () => {
    for (const [i, a] of INITIAL_SHAPES.entries()) {
      for (const b of INITIAL_SHAPES.slice(i + 1)) {
        const [p, q] = [box(a, HIT_MARGIN), box(b, HIT_MARGIN)];
        expect(p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom, `${a.id} on ${b.id}`).toBe(false);
      }
    }
  });

  it('ends no line at a shape, so nothing reads as a connector', () => {
    for (const line of INITIAL_SHAPES.filter((shape) => shape.type === 'line')) {
      const ends = [
        { x: line.x, y: line.y },
        { x: line.x + line.width, y: line.y + line.height },
      ];
      for (const shape of INITIAL_SHAPES.filter((other) => other.id !== line.id)) {
        const b = box(shape, ATTACHED_DISTANCE);
        for (const end of ends)
          expect(end.x >= b.left && end.x <= b.right && end.y >= b.top && end.y <= b.bottom, `${line.id} ends at ${shape.id}`).toBe(false);
      }
    }
  });
});
