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
// fixture's key. On a phone the sheets stack and the edge layer goes.

const POLICIES: Choice<Session['policy']>[] = [
  { value: 'balanced', label: 'Balanced votes', note: 'more final than intermediate' },
  { value: 'precision', label: 'Precision gate', note: 'no negative votes' },
];
// what "sent to review" means under each policy: a tie, or under the gate a
// final held back by a single vote against
const REVIEW_MEANING: Record<Session['policy'], string> = {
  balanced: 'final and intermediate votes tied',
  precision: 'votes tied, or a final with any vote against',
};
/** the scratch formula both policies call final: a dependency sink with nothing else behind it */
export const SCRATCH_CELL = 'Report!B4';
const REVIEW: Choice<'none' | 'drop'>[] = [
  { value: 'none', label: 'Off' },
  { value: 'drop', label: `Drop ${SCRATCH_CELL}` },
];
/** each sheet column spans this many units of the edge layer; a row the same */
const UNIT = 100;
const CENTER = UNIT / 2;
/** a same-sheet edge bows out three quarters of this, just past the cards into the gutter on their right */
const LOOP = UNIT * 0.65;

const percent = (x: number | null) => (x === null ? 'n/a' : `${Math.round(x * 100)}%`);
const baselineScore = (policy: Session['policy']) => {
  const session = { ...freshSession(), policy };
  return compareGold(session, analyze(session))!;
};
const BASELINE = freshSession().workbook.cells;
const named = (id: string) => BASELINE.find((c) => cellId(c) === id)!.label;
const GOLD = fixtures.baseline.gold;
const list = (items: readonly string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]);

export function FinalityGraph({ demo }: { demo: SheetDemo }) {
  const { run, result, selected } = demo;
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const gold = demo.score ? new Set<string>(fixtures[run.fixture].gold ?? []) : null;
  const balanced = baselineScore('balanced');
  const precision = baselineScore('precision');
  const finals = balanced.tp + balanced.fn;
  const goldNames = [...new Set(GOLD.map(named))];
  const rules = Object.values(result.cells).find((c) => c.votes.length > 0)?.votes.length ?? 0;

  const sheets = run.workbook.sheets;
  const rows = Math.max(...sheets.map((s) => run.workbook.cells.filter((c) => c.sheet === s.name).length));
  const place = new Map<string, { col: number; row: number }>();
  sheets.forEach((sheet, col) => run.workbook.cells.filter((c) => c.sheet === sheet.name).forEach((cell, row) => place.set(cellId(cell), { col, row })));
  const point = (id: string) => {
    const p = place.get(id)!;
    return { x: p.col * UNIT + CENTER, y: p.row * UNIT + CENTER };
  };
  // the key's workbook carries the scratch-cell story; the cycles workbook has no key and nothing to review against it
  const keyed = fixtures[run.fixture].gold !== null;
  const invalid = Object.values(result.cells).filter((c) => c.label === 'invalid').length;
  // the switch shows a review made in the inspector too: neither of its options when it is not one of them
  const reviews = Object.entries(run.adjudications);
  const review = reviews.length === 0 ? 'none' : reviews.length === 1 && run.adjudications[SCRATCH_CELL] === 'drop' ? 'drop' : null;

  return (
    <div className={styles.hero}>
      {keyed ? (
        <>
          <p className={styles.headline}>
            With balanced votes the rules find {balanced.tp} of {finals} final values and wrongly mark {balanced.fp} scratch cell final. The
            precision gate, built to be stricter, finds {precision.tp === 0 ? 'none' : precision.tp} and{' '}
            {precision.fp > 0 ? 'still marks the scratch cell' : 'leaves the scratch cell alone'}.
          </p>
          <p className={controls.lead}>
            A final value is one someone would report; an intermediate is a working step. The answer key marks {list(GOLD)} final (
            {goldNames.length === 1 ? `both “${goldNames[0]}”` : goldNames.map((n) => `“${n}”`).join(' and ')}); {SCRATCH_CELL}, &ldquo;
            {named(SCRATCH_CELL)}&rdquo;, is not. {rules} simple rules each vote final, intermediate or abstain on every cell, and the rule
            policy turns their votes into a label; a cell the policy cannot settle is sent to review, for a person to decide. Lines run from a
            value to the cells that use it; on a phone the inspector below lists them. Click a cell to see how each rule voted.
          </p>
        </>
      ) : (
        <>
          <p className={styles.headline}>
            {invalid} of {run.workbook.cells.length} cells cannot be computed: a cycle or a missing reference blocks them and every cell that
            depends on them, so they are labelled invalid and the rules do not vote on them.
          </p>
          <p className={controls.lead}>
            This workbook has no answer key, so nothing here is scored. The cells that can be computed are still labelled final, intermediate
            or review. Click a cell to see what blocks it or how each rule voted.
          </p>
        </>
      )}
      <div className={controls.row}>
        <Segmented
          legend="Rule policy"
          name="policy"
          options={POLICIES}
          value={run.policy}
          onChange={(policy) => {
            setNote(Object.keys(run.adjudications).length > 0 ? 'Switching the policy cleared the review: a review is made under one policy.' : '');
            demo.setPolicy(policy);
          }}
        />
        {keyed && (
          <Segmented
            legend="Prune-only review"
            name="review"
            options={REVIEW}
            value={review}
            onChange={(v) => {
              setNote('');
              setError(demo.setReview(v === 'drop' ? { [SCRATCH_CELL]: 'drop' } : {}) ?? '');
            }}
          />
        )}
      </div>
      {keyed && (
        <p className={controls.hint}>
          A prune-only review can remove a final and never add one. The reviewer here can see the answer key, so dropping {SCRATCH_CELL} is
          not the rules getting better.
        </p>
      )}
      {review === null && (
        <p className={controls.hint}>
          Reviewed in the inspector: {list(reviews.map(([id, verdict]) => `${id} ${verdict === 'drop' ? 'dropped' : 'kept as final'}`))}. Off
          clears every review.
        </p>
      )}
      {note && (
        <p role="status" className={controls.hint}>
          {note}
        </p>
      )}
      {error && (
        <p role="alert" className={controls.error}>
          {error}
        </p>
      )}
      {demo.score && (
        <dl className={styles.scoreStrip} aria-live="polite">
          <div>
            <dt>
              Finals found<small>of the key&apos;s finals</small>
            </dt>
            <dd>
              {demo.score.tp} <span>of {demo.score.tp + demo.score.fn}</span>
            </dd>
          </div>
          <div>
            <dt>
              False finals<small>marked final, not in the key</small>
            </dt>
            <dd data-bad={demo.score.fp > 0 || undefined}>{demo.score.fp}</dd>
          </div>
          <div>
            <dt>
              Sent to review<small>{REVIEW_MEANING[run.policy]}</small>
            </dt>
            <dd>{demo.score.review}</dd>
          </div>
          <div>
            <dt>
              Precision<small>marked finals that are right</small>
            </dt>
            <dd>
              {percent(demo.score.precision)}
              {demo.score.precision === null && <span> nothing marked final</span>}
            </dd>
          </div>
          <div>
            <dt>
              F1<small>precision and recall in one score</small>
            </dt>
            <dd>{percent(demo.score.f1)}</dd>
          </div>
        </dl>
      )}

      <ul className={styles.key} aria-label="Graph key">
        <li data-label="final">Final</li>
        <li data-label="intermediate">Intermediate</li>
        <li data-label="review">Review: {REVIEW_MEANING[run.policy]}</li>
        {invalid > 0 && <li data-label="invalid">Invalid: cannot be computed</li>}
        {gold && <li data-flag="false-final">Wrong against the key</li>}
      </ul>
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
            {/* sheet by sheet in the markup, so a phone can stack them in order */}
            {sheets.map((sheet, col) => [
              <p key={sheet.name} className={styles.sheetName} style={{ gridColumn: col + 1 }}>
                {sheet.name} <span>{sheet.role}</span>
              </p>,
              ...run.workbook.cells
                .filter((cell) => cell.sheet === sheet.name)
                .map((cell) => {
                  const id = cellId(cell);
                  const computed = result.cells[id];
                  const { row } = place.get(id)!;
                  const flag =
                    gold && computed.label === 'final' && !gold.has(id) ? 'false-final' : gold && computed.label !== 'final' && gold.has(id) ? 'missed' : undefined;
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
                      onClick={() => demo.inspect(id)}
                    >
                      <span className={styles.nodeHead}>
                        <strong>{cell.address}</strong>
                        <span className={styles.nodeLabel}>{computed.label}</span>
                      </span>
                      <span className={styles.nodeName}>{cell.label}</span>
                      <span className={styles.nodeValue}>{computed.error ? 'error' : computed.value?.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                    </button>
                  );
                }),
            ])}
          </div>
        </div>
      </ProjectFigureTransition>
    </div>
  );
}
