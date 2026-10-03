import { analyze, freshSession } from '@/lib/projects/spreadsheet-reasoning/engine';
import { cellId } from '@/lib/projects/spreadsheet-reasoning/types';
import type { ProjectVisualProps } from '../visuals';

// The card picture: the page's graph at card size. Three sheet columns of
// cells, the dependency edges between them, and the cells the balanced
// rules call final as accent squares. Drawn in the .rv vocabulary.

const W = 320;
const H = 180;
const COLUMN = 96;
const LEFT = 28;
const TOP = 34;
const ROW = 34;
const CELL = 14;

export function SheetVisual({ accent = true }: ProjectVisualProps) {
  const session = freshSession();
  const result = analyze(session);
  const place = new Map<string, { x: number; y: number }>();
  session.workbook.sheets.forEach((sheet, col) =>
    session.workbook.cells.filter((c) => c.sheet === sheet.name).forEach((cell, row) => place.set(cellId(cell), { x: LEFT + col * COLUMN + CELL, y: TOP + row * ROW })),
  );
  const edges = result.edges
    .map(({ from, to }) => {
      const a = place.get(from)!;
      const b = place.get(to)!;
      return a.x === b.x ? `M${a.x + CELL / 2} ${a.y}C${a.x + CELL * 2} ${a.y} ${b.x + CELL * 2} ${b.y} ${b.x + CELL / 2} ${b.y}` : `M${a.x + CELL / 2} ${a.y}L${b.x - CELL / 2} ${b.y}`;
    })
    .join('');
  const cells = Object.values(result.cells).map((c) => ({ ...place.get(c.id)!, final: c.label === 'final' }));
  return (
    <svg className="rv" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false" data-accent={accent ? 'on' : undefined}>
      <path className="l" d={edges} />
      <path className="d" d={cells.filter((c) => !c.final).map((c) => `M${c.x} ${c.y}h0`).join('')} strokeWidth={CELL} />
      <path className="d h" d={cells.filter((c) => c.final).map((c) => `M${c.x} ${c.y}h0`).join('')} strokeWidth={CELL} />
    </svg>
  );
}
