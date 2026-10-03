'use client';

import { useId } from 'react';
import type { Analysis, Workbook } from '@/lib/projects/spreadsheet-reasoning/types';
import { cellId } from '@/lib/projects/spreadsheet-reasoning/types';
import styles from './inspector.module.css';

export default function DependencyGraph({ workbook, result, selected, onSelect }: {
  workbook: Workbook; result: Analysis; selected: string; onSelect: (id: string) => void;
}) {
  const marker = useId().replace(/:/g, '');
  const positions = new Map<string, { x: number; y: number }>();
  workbook.sheets.forEach((sheet, col) => {
    workbook.cells.filter(c => c.sheet === sheet.name).forEach((cell, row) => positions.set(cellId(cell), { x: 30 + col * 320, y: 60 + row * 96 }));
  });
  const rows = Math.max(...workbook.sheets.map(s => workbook.cells.filter(c => c.sheet === s.name).length));
  const width = workbook.sheets.length * 320;
  const height = rows * 96 + 70;
  return <div className={styles.graphScroll} tabIndex={0} role="region" aria-label="Workbook dependency graph">
    <svg className={styles.graph} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Directed edges run from precedent to consumer">
      <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
      {workbook.sheets.map((sheet, col) => <text key={sheet.name} x={30 + col * 320} y={28} className={styles.sheetHeading}>{sheet.name} / {sheet.role}</text>)}
      {result.edges.map(edge => {
        const a = positions.get(edge.from)!, b = positions.get(edge.to)!;
        const linked = edge.from === selected || edge.to === selected;
        const sameColumn = a.x === b.x;
        const path = sameColumn
          ? `M ${a.x + 250} ${a.y + 30} C ${a.x + 295} ${a.y + 30}, ${b.x + 295} ${b.y + 30}, ${b.x + 250} ${b.y + 30}`
          : `M ${a.x + 250} ${a.y + 30} C ${a.x + 300} ${a.y + 30}, ${b.x - 45} ${b.y + 30}, ${b.x} ${b.y + 30}`;
        return <path key={`${edge.from}-${edge.to}`} d={path} className={linked ? styles.edgeActive : styles.edge} markerEnd={`url(#${marker})`}><title>{`${edge.from} feeds ${edge.to}`}</title></path>;
      })}
      {workbook.cells.map(cell => {
        const id = cellId(cell), p = positions.get(id)!, computed = result.cells[id];
        return <g key={id} transform={`translate(${p.x},${p.y})`} role="button" tabIndex={0} aria-label={`Select graph cell ${id}`} aria-pressed={selected === id}
          onClick={() => onSelect(id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(id); } }} className={styles.node}>
          <rect width={250} height={64} rx={4} className={selected === id ? styles.nodeSelected : styles.nodeBox} />
          <circle cx={16} cy={18} r={4} className={styles[computed.label]} />
          <text x={28} y={23} className={styles.nodeTitle}>{cell.address} / {cell.label.length > 24 ? `${cell.label.slice(0, 21)}...` : cell.label}</text>
          <text x={14} y={48} className={styles.nodeDetail}>{computed.error ? 'Invalid computation' : `${computed.value?.toLocaleString('en-US', { maximumFractionDigits: 2 })} / ${computed.label}`}</text>
        </g>;
      })}
    </svg>
  </div>;
}
