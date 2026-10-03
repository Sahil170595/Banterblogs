// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Sahil Kadadekar. Adapted point/segment hit-testing; see NOTICE.txt.
import { BOARD_HEIGHT, BOARD_WIDTH, MIN_SIZE, type Shape, type ShapeType } from './engine';

export type Point = { x: number; y: number };
export type Corner = 'nw' | 'ne' | 'sw' | 'se';
export const HIT_MARGIN = 4;
export const LINE_EXTRA_MARGIN = 4;
export const HANDLE_SIZE = 10;
export const HANDLE_HIT_SIZE = 18;
const TEXT_WIDTH = 180;
const TEXT_HEIGHT = 64;
export function bounds(shape: Shape) {
  return { left: Math.min(shape.x, shape.x + shape.width), top: Math.min(shape.y, shape.y + shape.height), right: Math.max(shape.x, shape.x + shape.width), bottom: Math.max(shape.y, shape.y + shape.height) };
}
function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function contains(shape: Shape, x: number, y: number) {
  if (shape.type === 'ellipse') {
    const rx = Math.abs(shape.width / 2) + HIT_MARGIN;
    const ry = Math.abs(shape.height / 2) + HIT_MARGIN;
    return ((x - shape.x - shape.width / 2) / rx) ** 2 + ((y - shape.y - shape.height / 2) / ry) ** 2 <= 1;
  }
  if (shape.type === 'line') return distanceToSegment(x, y, shape.x, shape.y, shape.x + shape.width, shape.y + shape.height) <= shape.strokeWidth / 2 + HIT_MARGIN + LINE_EXTRA_MARGIN;
  return x >= shape.x - HIT_MARGIN && x <= shape.x + shape.width + HIT_MARGIN && y >= shape.y - HIT_MARGIN && y <= shape.y + shape.height + HIT_MARGIN;
}
export function hitTest(shapes: readonly Shape[], x: number, y: number, selectedId?: string | null): Shape | null {
  const selected = shapes.find((shape) => shape.id === selectedId);
  if (selected && contains(selected, x, y)) return selected;
  for (let i = shapes.length - 1; i >= 0; i--) if (contains(shapes[i], x, y)) return shapes[i];
  return null;
}
export function handles(shape: Shape): { corner: Corner; x: number; y: number }[] {
  const box = bounds(shape);
  return [
    { corner: 'nw', x: box.left, y: box.top }, { corner: 'ne', x: box.right, y: box.top },
    { corner: 'sw', x: box.left, y: box.bottom }, { corner: 'se', x: box.right, y: box.bottom },
  ];
}
export function hitHandle(shape: Shape, point: Point): Corner | null {
  if (shape.type === 'line') return null;
  return handles(shape).find((handle) => Math.abs(handle.x - point.x) <= HANDLE_HIT_SIZE / 2 && Math.abs(handle.y - point.y) <= HANDLE_HIT_SIZE / 2)?.corner ?? null;
}
export function clampPoint(point: Point): Point {
  return { x: Math.max(0, Math.min(BOARD_WIDTH, point.x)), y: Math.max(0, Math.min(BOARD_HEIGHT, point.y)) };
}
export function clampMove(shape: Pick<Shape, 'width' | 'height'>, x: number, y: number): Point {
  return {
    x: Math.max(-Math.min(0, shape.width), Math.min(BOARD_WIDTH - Math.max(0, shape.width), x)),
    y: Math.max(-Math.min(0, shape.height), Math.min(BOARD_HEIGHT - Math.max(0, shape.height), y)),
  };
}
export function makeShape(type: ShapeType, startInput: Point, endInput: Point, id: string, fill: string): Shape {
  const start = clampPoint(startInput);
  const end = clampPoint(endInput);
  if (type === 'line') return { id, type, x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y, fill, stroke: '#25343c', strokeWidth: 3 };
  const width = type === 'text' ? TEXT_WIDTH : Math.max(MIN_SIZE, Math.abs(end.x - start.x));
  const height = type === 'text' ? TEXT_HEIGHT : Math.max(MIN_SIZE, Math.abs(end.y - start.y));
  const position = clampMove({ width, height }, Math.min(start.x, end.x), Math.min(start.y, end.y));
  return { id, type, ...position, width, height, fill, stroke: '#25343c', strokeWidth: 2, ...(type === 'text' ? { text: 'New note', fontSize: 22 } : {}) };
}
export function resizeShape(shape: Shape, corner: Corner, input: Point): Shape {
  if (shape.type === 'line') return shape;
  const point = clampPoint(input);
  const box = bounds(shape);
  const left = corner.includes('w') ? Math.min(point.x, box.right - MIN_SIZE) : box.left;
  const right = corner.includes('e') ? Math.max(point.x, box.left + MIN_SIZE) : box.right;
  const top = corner.includes('n') ? Math.min(point.y, box.bottom - MIN_SIZE) : box.top;
  const bottom = corner.includes('s') ? Math.max(point.y, box.top + MIN_SIZE) : box.bottom;
  return { ...shape, x: left, y: top, width: right - left, height: bottom - top };
}
