import type { Shape } from './engine';

// Fresh fictional workflow; no accounts, company material or imported board state.
// The model has no groups or connectors, so nothing sits on another object and
// no line joins two shapes: each step's name is a caption under it, and moving
// a step's shape leaves its caption where it is (fixtures.test.ts).
export const INITIAL_SHAPES: readonly Shape[] = [
  { id: 'headline', type: 'text', x: 90, y: 60, width: 560, height: 55, fill: '#25343c', stroke: '#25343c', strokeWidth: 1, text: 'A small publishing workflow', fontSize: 32 },
  { id: 'draft', type: 'rectangle', x: 90, y: 170, width: 200, height: 120, fill: '#cfeee2', stroke: '#175e50', strokeWidth: 2 },
  { id: 'review', type: 'ellipse', x: 380, y: 170, width: 200, height: 120, fill: '#dae9fc', stroke: '#265c9b', strokeWidth: 2 },
  { id: 'publish', type: 'rectangle', x: 670, y: 170, width: 200, height: 120, fill: '#f5e6aa', stroke: '#685419', strokeWidth: 2 },
  { id: 'draft-caption', type: 'text', x: 90, y: 302, width: 200, height: 42, fill: '#25343c', stroke: '#25343c', strokeWidth: 1, text: 'Draft', fontSize: 26 },
  { id: 'review-caption', type: 'text', x: 380, y: 302, width: 200, height: 42, fill: '#25343c', stroke: '#25343c', strokeWidth: 1, text: 'Review', fontSize: 26 },
  { id: 'publish-caption', type: 'text', x: 670, y: 302, width: 200, height: 42, fill: '#25343c', stroke: '#25343c', strokeWidth: 1, text: 'Publish', fontSize: 26 },
  { id: 'note', type: 'text', x: 90, y: 400, width: 470, height: 105, fill: '#175e50', stroke: '#175e50', strokeWidth: 1, text: 'A second review can change the route.\nWhat would you rearrange?', fontSize: 22 },
];
