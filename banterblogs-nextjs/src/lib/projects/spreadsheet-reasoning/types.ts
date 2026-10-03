import { z } from 'zod';

export const MAX_CELLS = 48;
export const MAX_RANGE_CELLS = 64;
export const labels = ['final', 'intermediate', 'review', 'invalid'] as const;
export type Label = typeof labels[number];
export type Vote = 'final' | 'intermediate' | 'abstain';
export const workbookSchema = z.object({
  sheets: z.array(z.object({
    name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,19}$/),
    role: z.enum(['output', 'support']),
  }).strict()).min(1).max(6),
  cells: z.array(z.object({
    sheet: z.string().min(1).max(20),
    address: z.string().regex(/^[A-Z]{1,2}[1-9][0-9]{0,2}$/),
    label: z.string().min(1).max(80),
    input: z.string().min(1).max(256),
    emphasis: z.boolean(),
  }).strict()).min(1).max(MAX_CELLS),
}).strict();
export type Workbook = z.infer<typeof workbookSchema>;
export type Cell = Workbook['cells'][number];
export const sessionSchema = z.object({
  fixture: z.enum(['baseline', 'broken']),
  workbook: workbookSchema,
  policy: z.enum(['balanced', 'precision']),
  adjudications: z.record(z.enum(['keep', 'drop'])),
}).strict();
export type Session = z.infer<typeof sessionSchema>;
export type CellResult = {
  id: string;
  value: number | null;
  error: string | null;
  precedents: string[];
  dependents: string[];
  votes: { method: string; vote: Vote; evidence: string }[];
  proposed: Label;
  label: Label;
  route: string;
};
export type Analysis = { cells: Record<string, CellResult>; edges: { from: string; to: string }[] };
export const cellId = (cell: Pick<Cell, 'sheet' | 'address'>) => `${cell.sheet}!${cell.address}`;
