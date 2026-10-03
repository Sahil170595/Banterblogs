'use client';

import { useState, type CSSProperties } from 'react';
import { analyze, compareGold, freshSession } from '@/lib/projects/spreadsheet-reasoning/engine';
import { fixtures } from '@/lib/projects/spreadsheet-reasoning/fixtures';
import { cellId, type Session } from '@/lib/projects/spreadsheet-reasoning/types';
import { controls, Segmented, type Choice } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import type { SheetDemo } from './useSheetDemo';
import styles from './sheet.module.css';

// The hero: the workbook as its dependency graph, sheets left to right, each
// cell labelled by the rules. The policy and a prune-only review are the
// controls; the line above says what that labelling gets right against the
// fixture's key.

const POLICIES: Choice<Session['policy']>[] = [
  { value: 'balanced', label: 'Balanced votes' },
  { value: 'precision', label: 'Precision gate', note: 'no negative votes' },
];
/** the scratch formula both policies call final: a dependency sink with nothing else behind it */
export const SCRATCH_CELL = 'Report!B4';
const REVIEW: Choice<'none' | 'drop'>[] = [
  { value: 'none', label: 'No review' },
  { value: 'drop', label: `Drop ${SCRATCH_CELL}` },
];
/** each sheet column spans this many units of the edge layer; a row the same */
const UNIT = 100;
const CENTER = UNIT / 2;
/** a same-sheet edge bows out three quarters of this, just past the cards into the gutter on their right */
const LOOP = UNIT * 0.65;

const percent = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
const baselineScore = (policy: Session['policy']) => {
  const session = { ...freshSession(), policy };
  return compareGold(session, analyze(session))!;
};

export function FinalityGraph({ demo }: { demo: SheetDemo }) {
  const { run, result, selected } = demo;
  const [error, setError] = useState('');
  const gold = demo.score ? new Set<string>(fixtures[run.fixture].gold ?? []) : null;
  const balanced = baselineScore('balanced');
  const precision = baselineScore('precision');
  const finals = balanced.tp + balanced.fn;

  const sheets = run.workbook.sheets;
  const rows = Math.max(...sheets.map((s) => run.workbook.cells.filter((c) => c.sheet === s.name).length));
  const place = new Map<string, { col: number; row: number }>();
  sheets.forEach((sheet, col) => run.workbook.cells.filter((c) => c.sheet === sheet.name).forEach((cell, row) => place.set(cellId(cell), { col, row })));
  const point = (id: string) => {
    const p = place.get(id)!;
    return { x: p.col * UNIT + CENTER, y: p.row * UNIT + CENTER };
  };
  const review = run.adjudications[SCRATCH_CELL] === 'drop' ? 'drop' : 'none';

  return (
    <div className={styles.hero}>
      <p className={styles.headline}>
        Balanced votes find {balanced.tp} of {finals} final values and wrongly mark {balanced.fp} scratch cell final. The precision
        gate, built to be stricter, finds {precision.tp === 0 ? 'none' : precision.tp} and{' '}
        {precision.fp > 0 ? 'still marks the scratch cell' : 'leaves the scratch cell alone'}.
      </p>
      <div className={controls.row}>
        <Segmented legend="Rule policy" name="policy" options={POLICIES} value={run.policy} onChange={demo.setPolicy} />
        <Segmented
          legend="Prune-only review"
          name="review"
          options={REVIEW}
          value={review}
          onChange={(v) => setError(demo.adjudicate(SCRATCH_CELL, v === 'drop' ? 'drop' : null) ?? '')}
        />
      </div>
      {error && (
        <p role="alert" className={controls.error}>
          {error}
        </p>
      )}
      {demo.score && (
        <dl className={styles.scoreStrip} aria-live="polite">
          <div>
            <dt>Finals found</dt>
            <dd>
              {demo.score.tp} <span>of {demo.score.tp + demo.score.fn}</span>
            </dd>
          </div>
          <div>
            <dt>False finals</dt>
            <dd data-bad={demo.score.fp > 0 || undefined}>{demo.score.fp}</dd>
          </div>
          <div>
            <dt>Sent to review</dt>
            <dd>{demo.score.review}</dd>
          </div>
          <div>
            <dt>Precision</dt>
            <dd>{percent(demo.score.precision)}</dd>
          </div>
          <div>
            <dt>F1</dt>
            <dd>{percent(demo.score.f1)}</dd>
          </div>
        </dl>
      )}

      <ProjectFigureTransition slug="spreadsheet-reasoning">
        <div className={styles.graphScroll} role="region" aria-label="Workbook dependency graph" tabIndex={0}>
          <div className={styles.graph} style={{ '--cols': sheets.length, '--rows': rows } as CSSProperties}>
            <svg className={styles.edges} viewBox={`0 0 ${sheets.length * UNIT} ${rows * UNIT}`} preserveAspectRatio="none" aria-hidden="true">
              {result.edges.map((edge) => {
                const a = point(edge.from);
                const b = point(edge.to);
                const linked = edge.from === selected || edge.to === selected;
                const d = a.x === b.x ? `M ${a.x} ${a.y} C ${a.x + LOOP} ${a.y}, ${b.x + LOOP} ${b.y}, ${b.x} ${b.y}` : `M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`;
                return <path key={`${edge.from}-${edge.to}`} d={d} data-linked={linked || undefined} />;
              })}
            </svg>
            {sheets.map((sheet, col) => (
              <p key={sheet.name} className={styles.sheetName} style={{ gridColumn: col + 1 }}>
                {sheet.name} <span>{sheet.role}</span>
              </p>
            ))}
            {run.workbook.cells.map((cell) => {
              const id = cellId(cell);
              const computed = result.cells[id];
              const { col, row } = place.get(id)!;
              const flag = gold && computed.label === 'final' && !gold.has(id) ? 'false-final' : gold && computed.label !== 'final' && gold.has(id) ? 'missed' : undefined;
              return (
                <button
                  key={id}
                  type="button"
                  className={styles.node}
                  style={{ gridColumn: col + 1, gridRow: row + 2 }}
                  data-label={computed.label}
                  data-flag={flag}
                  aria-pressed={selected === id}
                  aria-label={`${id}, ${cell.label}: ${computed.error ? 'invalid' : computed.value}, labelled ${computed.label}${flag === 'false-final' ? ', not final in the key' : flag === 'missed' ? ', final in the key' : ''}`}
                  onClick={() => demo.select(id)}
                >
                  <span className={styles.nodeHead}>
                    <strong>{cell.address}</strong>
                    <span className={styles.nodeLabel}>{computed.label}</span>
                  </span>
                  <span className={styles.nodeName}>{cell.label}</span>
                  <span className={styles.nodeValue}>{computed.error ? 'error' : computed.value?.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </button>
              );
            })}
          </div>
        </div>
      </ProjectFigureTransition>
      <ul className={styles.key} aria-label="Graph key">
        <li data-label="final">Final</li>
        <li data-label="intermediate">Intermediate</li>
        <li data-label="review">Review</li>
        <li data-flag="false-final">Wrong against the key</li>
      </ul>
      <p className={styles.caption}>
        Edges run from a value to the cells that use it. The key marks {fixtures.baseline.gold.join(' and ')} final. Select a cell to see
        every rule&apos;s vote below.
      </p>
    </div>
  );
}
