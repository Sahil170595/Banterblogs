'use client';

import { useRef, useState } from 'react';
import { Download, Play, RotateCcw, Upload } from 'lucide-react';
import { ballotProvenance, fixtures } from '@/lib/projects/spreadsheet-reasoning/fixtures';
import { cellId, type Session, type Vote } from '@/lib/projects/spreadsheet-reasoning/types';
import { controls, UnderTheHood } from '../controls';
import type { SheetDemo } from './useSheetDemo';
import styles from './sheet.module.css';

// Under the graph: the selected cell's evidence, each rule's vote with what
// the rule looks at, for everyone; the workbook's cells, the editor, review,
// the illustrative ballots and import/export under the hood. Edits wait for
// Recalculate.

const number = (value: number | null) => (value === null ? 'unavailable' : value.toLocaleString('en-US', { maximumFractionDigits: 2 }));
const majority = (votes: Vote[]) => {
  const final = votes.filter((v) => v === 'final').length;
  const intermediate = votes.filter((v) => v === 'intermediate').length;
  return final > intermediate ? 'final' : intermediate > final ? 'intermediate' : 'review';
};
/** what each rule looks at, in a few plain words (engine.ts holds the rules) */
const RULE_GLOSS: Record<string, string> = {
  'Dependency sink': 'a formula no other cell uses',
  'Range aggregation': 'adds up a range with SUM',
  'Output lexicon': 'its label says total, net or output',
  'Input literal': 'a typed-in value, not a formula',
  'Pass-through': 'only points at one other cell',
  'Consumed downstream': 'other cells use it',
  'Emphasized checkpoint': 'emphasized in the sheet, with a total label or a SUM',
};

export function Inspector({ demo }: { demo: SheetDemo }) {
  const { run, draft, result, pending, selected } = demo;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const cell = draft.workbook.cells.find((c) => cellId(c) === selected) ?? draft.workbook.cells[0];
  const computed = result.cells[cellId(cell)];
  const ballots = demo.ballots?.[cellId(cell)];

  const editCell = (change: Partial<typeof cell>) =>
    demo.edit({ ...draft, workbook: { ...draft.workbook, cells: draft.workbook.cells.map((c) => (cellId(c) === cellId(cell) ? { ...c, ...change } : c)) } });
  const exportJson = () => {
    try {
      const url = URL.createObjectURL(new Blob([demo.exportJson()], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'spreadsheet-reasoning-v1.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice('Trace exported.');
    } catch (cause) {
      console.error('Spreadsheet export failed:', cause);
      setError('The trace could not be exported.');
    }
  };

  return (
    <div className={styles.lab}>
      <section className={styles.evidence} aria-label="Selected cell evidence">
        <h3 className={styles.evidenceTitle}>{cellId(cell)}</h3>
        <p className={styles.cellSummary}>
          {cell.label}: {pending ? 'pending' : computed?.error ? 'error' : number(computed?.value ?? null)}{' '}
          {!pending && computed && (
            <span className={styles.chip} data-label={computed.label}>
              {computed.label}
            </span>
          )}
        </p>
        {error && (
          <p role="alert" className={controls.error}>
            {error}
          </p>
        )}
        {!pending && computed?.error && (
          <p role="alert" className={controls.error}>
            {computed.error}
          </p>
        )}
        {!pending && computed && (
          <>
            <p className={styles.route}>{computed.route}</p>
            <dl className={styles.links}>
              <div>
                <dt>Uses</dt>
                <dd>{computed.precedents.join(', ') || 'nothing'}</dd>
              </div>
              <div>
                <dt>Used by</dt>
                <dd>{computed.dependents.join(', ') || 'nothing'}</dd>
              </div>
            </dl>
            <p className={controls.hint}>Each rule votes final or intermediate, or abstains when it has no opinion.</p>
            <ul className={styles.votes}>
              {computed.votes.map((v) => (
                <li key={v.method} data-vote={v.vote}>
                  <span>
                    {v.method}
                    <em>{RULE_GLOSS[v.method]}</em>
                  </span>
                  <strong>{v.vote === 'abstain' ? 'abstains' : v.vote}</strong>
                  <small>{v.evidence}</small>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <UnderTheHood summary="Edit the workbook, review a cell, the illustrative ballots, export and replay">
        <div className={styles.toolbar}>
          <label className={controls.field}>
            Workbook
            <select value={draft.fixture} onChange={(e) => demo.reset(e.target.value as Session['fixture'])}>
              {Object.entries(fixtures).map(([key, fixture]) => (
                <option key={key} value={key}>
                  {fixture.title}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={controls.button} onClick={() => setError(demo.recalculate() ?? '')} disabled={!pending}>
            <Play aria-hidden="true" />
            Recalculate
          </button>
          <div className={styles.icons}>
            <button type="button" className={controls.iconButton} aria-label="Reset workbook" title="Reset workbook" onClick={() => demo.reset()}>
              <RotateCcw aria-hidden="true" />
              <span className={controls.iconLabel}>Reset workbook</span>
            </button>
            <button type="button" className={controls.iconButton} aria-label="Export JSON" title="Export JSON" disabled={pending} onClick={exportJson}>
              <Download aria-hidden="true" />
              <span className={controls.iconLabel}>Export JSON</span>
            </button>
            <button type="button" className={controls.iconButton} aria-label="Replay JSON" title="Replay JSON" onClick={() => file.current?.click()}>
              <Upload aria-hidden="true" />
              <span className={controls.iconLabel}>Replay JSON</span>
            </button>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              aria-label="JSON replay file"
              hidden
              onChange={async (e) => {
                const picked = e.target.files?.[0];
                if (picked) setError((await demo.importTrace(picked)) ?? '');
                if (file.current) file.current.value = '';
              }}
            />
          </div>
        </div>
        <p className={controls.hint} aria-live="polite">
          {pending
            ? 'Edited: the graph and evidence show the last calculation until you recalculate.'
            : `${run.workbook.cells.length} cells · ${result.edges.length} dependency edges · computed in your browser, no model calls. Edit a cell, then recalculate.`}
        </p>

        <div className={styles.labBody}>
          <div className={styles.tableScroll} role="region" aria-label="Workbook cells" tabIndex={0}>
            <table className={styles.cells}>
              <thead>
                <tr>
                  <th scope="col">Cell</th>
                  <th scope="col">Row label</th>
                  <th scope="col">Value</th>
                  <th scope="col">Label</th>
                </tr>
              </thead>
              <tbody>
                {draft.workbook.cells.map((item) => {
                  const id = cellId(item);
                  const out = result.cells[id];
                  return (
                    <tr key={id} data-selected={id === cellId(cell) || undefined}>
                      <td>
                        <button type="button" aria-label={`Inspect ${id}`} aria-pressed={id === cellId(cell)} onClick={() => demo.select(id)}>
                          {id}
                        </button>
                      </td>
                      <td>{item.label}</td>
                      <td className={styles.numeric}>{pending ? '—' : out?.error ? 'error' : number(out?.value ?? null)}</td>
                      <td>
                        <span className={styles.chip} data-label={pending ? undefined : out?.label}>
                          {pending ? 'pending' : out?.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.editor}>
            <h4>Edit {cellId(cell)}</h4>
            <label className={controls.field}>
              Row label
              <input maxLength={80} value={cell.label} onChange={(e) => editCell({ label: e.target.value })} />
            </label>
            <label className={controls.field}>
              Value or formula
              <input maxLength={256} spellCheck={false} className={styles.formula} value={cell.input} onChange={(e) => editCell({ input: e.target.value })} />
            </label>
            <div className={styles.pair}>
              <label className={styles.checkbox}>
                <input type="checkbox" checked={cell.emphasis} onChange={(e) => editCell({ emphasis: e.target.checked })} />
                Emphasized in the sheet
              </label>
              <label className={controls.field}>
                Sheet role
                <select
                  value={draft.workbook.sheets.find((s) => s.name === cell.sheet)?.role ?? 'output'}
                  onChange={(e) =>
                    demo.edit({
                      ...draft,
                      workbook: { ...draft.workbook, sheets: draft.workbook.sheets.map((s) => (s.name === cell.sheet ? { ...s, role: e.target.value as 'output' | 'support' } : s)) },
                    })
                  }
                >
                  <option value="output">Output</option>
                  <option value="support">Support</option>
                </select>
              </label>
            </div>
            <p className={controls.hint}>A support sheet&apos;s cells are always intermediate: it holds working steps, not results.</p>
            {!pending && computed && (
              <>
                <label className={controls.field}>
                  Prune-only review
                  <select
                    disabled={computed.proposed !== 'final'}
                    value={run.adjudications[cellId(cell)] ?? ''}
                    onChange={(e) => setError(demo.adjudicate(cellId(cell), (e.target.value || null) as 'keep' | 'drop' | null) ?? '')}
                  >
                    <option value="">Not reviewed</option>
                    <option value="keep">Keep as final</option>
                    <option value="drop">Drop to intermediate</option>
                  </select>
                </label>
                <p className={controls.hint}>Review can only remove a proposed final; it never adds one.</p>
              </>
            )}
            <div className={styles.ballots}>
              <h4>Illustrative ballots</h4>
              <p className={controls.hint}>
                Three votes per cell, showing how a majority over repeated votes reads. {ballotProvenance}
              </p>
              {ballots ? (
                <p>
                  {ballots.map((vote, i) => (
                    <span key={i} data-vote={vote}>
                      {vote}
                    </span>
                  ))}{' '}
                  → majority <strong>{majority(ballots)}</strong>
                </p>
              ) : (
                <p className={controls.hint}>None recorded for this cell or this workbook.</p>
              )}
            </div>
          </div>
        </div>
        <p className={styles.notice} role="status">
          {notice}
        </p>
      </UnderTheHood>
    </div>
  );
}
