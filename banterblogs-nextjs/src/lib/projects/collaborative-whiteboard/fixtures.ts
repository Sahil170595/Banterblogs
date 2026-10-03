import type { Shape } from './engine';

// Fresh fictional workflow; no accounts, company material or imported board state.
export const INITIAL_SHAPES: readonly Shape[] = [
  { id: 'draft', type: 'rectangle', x: 90, y: 170, width: 200, height: 120, fill: '#cfeee2', stroke: '#175e50', strokeWidth: 2 },
  { id: 'review', type: 'ellipse', x: 380, y: 170, width: 200, height: 120, fill: '#dae9fc', stroke: '#265c9b', strokeWidth: 2 },
  { id: 'publish', type: 'rectangle', x: 670, y: 170, width: 200, height: 120, fill: '#f5e6aa', stroke: '#685419', strokeWidth: 2 },
  { id: 'edge-one', type: 'line', x: 300, y: 230, width: 70, height: 0, fill: '#ffffff', stroke: '#25343c', strokeWidth: 3 },
  { id: 'edge-two', type: 'line', x: 590, y: 230, width: 70, height: 0, fill: '#ffffff', stroke: '#25343c', strokeWidth: 3 },
  { id: 'draft-label', type: 'text', x: 125, y: 208, width: 125, height: 42, fill: '#25343c', stroke: '#25343c', strokeWidth: 1, text: 'Draft', fontSize: 26 },
  { id: 'review-label', type: 'text', x: 422, y: 208, width: 135, height: 42, fill: '#25343c', stroke: '#25343c', strokeWidth: 1, text: 'Review', fontSize: 26 },
  { id: 'publish-label', type: 'text', x: 710, y: 208, width: 135, height: 42, fill: '#25343c', stroke: '#25343c', strokeWidth: 1, text: 'Publish', fontSize: 26 },
  { id: 'headline', type: 'text', x: 90, y: 65, width: 520, height: 55, fill: '#25343c', stroke: '#25343c', strokeWidth: 1, text: 'A small publishing workflow', fontSize: 32 },
  { id: 'note', type: 'text', x: 90, y: 370, width: 470, height: 105, fill: '#175e50', stroke: '#175e50', strokeWidth: 1, text: 'A second review can change the route.\nWhat would you rearrange?', fontSize: 22 },
];
