import type { Vote, Workbook } from './types';

// Authored from scratch; no imported workbook, model response, or benchmark key.
const workbook: Workbook = {
  sheets: [{ name: 'Inputs', role: 'support' }, { name: 'Calc', role: 'output' }, { name: 'Report', role: 'output' }],
  cells: [
    { sheet: 'Inputs', address: 'B2', label: 'Units', input: '120', emphasis: false },
    { sheet: 'Inputs', address: 'B3', label: 'Unit price', input: '12', emphasis: false },
    { sheet: 'Inputs', address: 'B4', label: 'Unit cost', input: '5', emphasis: false },
    { sheet: 'Inputs', address: 'B5', label: 'Overhead', input: '100', emphasis: false },
    { sheet: 'Calc', address: 'B2', label: 'Revenue', input: '=Inputs!B2*Inputs!B3', emphasis: false },
    { sheet: 'Calc', address: 'B3', label: 'Expense contribution', input: '=-Inputs!B2*Inputs!B4', emphasis: false },
    { sheet: 'Calc', address: 'B4', label: 'Total margin', input: '=SUM(B2:B3)', emphasis: true },
    { sheet: 'Calc', address: 'B5', label: 'After overhead', input: '=B4-Inputs!B5', emphasis: false },
    { sheet: 'Report', address: 'B2', label: 'Total margin', input: '=Calc!B4', emphasis: true },
    { sheet: 'Report', address: 'B3', label: 'Working check', input: '=Calc!B5', emphasis: false },
    { sheet: 'Report', address: 'B4', label: 'Scratch estimate', input: '=2*3', emphasis: false },
  ],
};
const broken: Workbook = structuredClone(workbook);
broken.cells[4].input = '=B3+1';
broken.cells[5].input = '=B2+1';
broken.cells[9].input = '=Missing!B2';

export const fixtures = {
  baseline: { title: 'Margin checkpoints', workbook, gold: ['Calc!B4', 'Report!B2'] },
  broken: { title: 'Cycles & missing references', workbook: broken, gold: null },
} as const;

export const ballotRecord: Record<string, Vote[]> = {
  'Calc!B4': ['final', 'final', 'intermediate'],
  'Report!B2': ['final', 'intermediate', 'final'],
  'Report!B3': ['intermediate', 'intermediate', 'intermediate'],
  'Report!B4': ['final', 'intermediate', 'intermediate'],
};
export const ballotProvenance = 'Authored illustrative ballots, not actual model output. Bound to the unedited baseline workbook. No live inference.';
