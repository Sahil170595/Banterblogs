'use client';

import { Fragment, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Check, Download, Minus, Plus, RotateCcw, Upload, X } from 'lucide-react';
import { brokenFilters, PipelineError, runSearch } from '@/lib/projects/staged-search/engine';
import { EXAMPLE_CORPUS, EXAMPLE_QUERY } from '@/lib/projects/staged-search/example';
import { makeReceipt, MAX_RECEIPT_BYTES, replayReceipt } from '@/lib/projects/staged-search/receipt';
import { DEFAULT_SETTINGS, FIELDS, OPS_FOR, type Query, type Settings } from '@/lib/projects/staged-search/schema';
import { controls, Segmented } from '../controls';
import { opFor, type Draft } from './draft';
import { formatFilter } from './format';
import styles from './search.module.css';

const DOCS = new Map(EXAMPLE_CORPUS.map((d) => [d.id, d]));
const THRESHOLDS = Array.from({ length: 12 }, (_, i) => i + 1);
const LIMITS = Array.from({ length: 10 }, (_, i) => i + 1);
const OP_LABELS = { Eq: 'is', NotEq: 'is not', Gte: 'from', Lte: 'up to', Contains: 'has', In: 'is one of', NotIn: 'is none of' } as const;
const fixed = (n: number, places: number) => n.toFixed(places);

export function SearchLab({
  draft,
  query,
  draftError,
  settings,
  onDraft,
  onSettings,
  onLoad,
}: {
  draft: Draft;
  query: Query;
  draftError: string | null;
  settings: Settings;
  onDraft: (draft: Draft) => void;
  onSettings: (settings: Settings) => void;
  onLoad: (query: Query, settings: Settings) => void;
}) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const run = useMemo(() => {
    try {
      return { report: runSearch(EXAMPLE_CORPUS, query, settings), error: null };
    } catch (cause) {
      if (!(cause instanceof PipelineError)) throw cause;
      return { report: null, error: cause.message };
    }
  }, [query, settings]);
  const edit = (next: Partial<Draft>) => {
    revision.current++;
    setFileError(null);
    setStatus('');
    onDraft({ ...draft, ...next });
  };
  const setFilter = (index: number, next: Partial<Draft['filters'][number]>) =>
    edit({ filters: draft.filters.map((f, i) => (i === index ? { ...f, ...next } : f)) });

  function exportRun() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(makeReceipt(query, settings), null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'staged-search.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Query, settings and results exported');
  }

  async function importRun(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const mine = ++revision.current;
    try {
      if (file.size > MAX_RECEIPT_BYTES) throw new Error(`The file is over ${MAX_RECEIPT_BYTES / 1000} KB.`);
      const text = await file.text();
      if (mine !== revision.current) return;
      const loaded = replayReceipt(JSON.parse(text));
      onLoad(loaded.query, loaded.settings);
      setFileError(null);
      setStatus('File rerun: its results follow from its query');
    } catch (cause) {
      if (mine !== revision.current) return;
      console.warn('Staged search file refused', cause);
      setFileError(`File refused: ${cause instanceof Error ? cause.message : 'it could not be read.'}`);
    } finally {
      input.value = '';
    }
  }

  const report = run.report;
  const primaryRank = new Map(report?.channels.primary.map((h, i) => [h.id, i + 1]));
  const secondaryRank = new Map(report?.channels.secondary.map((h, i) => [h.id, i + 1]));

  return (
    <div className={styles.lab}>
      <div className={styles.toolbar}>
        <p className={styles.labTitle}>The pipeline, on the source&apos;s eighteen example notes</p>
        <div className={styles.commands}>
          <button type="button" className={controls.iconButton} aria-label="Export the run" title="Export the run" onClick={exportRun}>
            <Download aria-hidden="true" />
          </button>
          <button type="button" className={controls.iconButton} aria-label="Import a run" title="Import a run" onClick={() => fileRef.current?.click()}>
            <Upload aria-hidden="true" />
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Run file" onChange={importRun} />
          <button
            type="button"
            className={controls.iconButton}
            aria-label="Reset to the source example"
            title="Reset to the source example"
            onClick={() => {
              revision.current++;
              setFileError(null);
              setStatus('');
              onLoad(EXAMPLE_QUERY, DEFAULT_SETTINGS);
            }}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      </div>
      {fileError && (
        <p role="alert" className={controls.error}>
          {fileError}
        </p>
      )}
      <p role="status" className={controls.hint}>
        {status}
      </p>

      <div className={styles.workspace}>
        <form className={styles.form} aria-label="Query" onSubmit={(event) => event.preventDefault()}>
          <label className={controls.field}>
            Description, the keyword query
            <input value={draft.description} onChange={(e) => edit({ description: e.target.value })} />
          </label>
          <div className={styles.pair}>
            <label className={controls.field}>
              Hard criteria
              <input value={draft.hard} onChange={(e) => edit({ hard: e.target.value })} />
            </label>
            <label className={controls.field}>
              Soft criteria
              <input value={draft.soft} onChange={(e) => edit({ soft: e.target.value })} />
            </label>
          </div>
          <p className={controls.hint}>Criteria are comma-separated; every token of a hard criterion must appear in the note.</p>
          <fieldset className={styles.filters}>
            <legend>Filters</legend>
            {draft.filters.map((f, i) => (
              <div key={i} className={styles.filterRow}>
                <label className={controls.field}>
                  <span className={styles.srOnly}>Filter {i + 1} field</span>
                  <select value={f.field} onChange={(e) => setFilter(i, { field: e.target.value as typeof f.field, op: opFor(e.target.value as typeof f.field, f.op) })}>
                    {FIELDS.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={controls.field}>
                  <span className={styles.srOnly}>Filter {i + 1} operator</span>
                  <select value={f.op} onChange={(e) => setFilter(i, { op: e.target.value as typeof f.op })}>
                    {OPS_FOR[f.field].map((op) => (
                      <option key={op} value={op}>
                        {OP_LABELS[op]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={controls.field}>
                  <span className={styles.srOnly}>Filter {i + 1} value</span>
                  <input value={f.value} onChange={(e) => setFilter(i, { value: e.target.value })} />
                </label>
                <button
                  type="button"
                  className={controls.iconButton}
                  aria-label={`Remove filter ${i + 1}`}
                  onClick={() => edit({ filters: draft.filters.filter((_, j) => j !== i) })}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="button" className={controls.button} onClick={() => edit({ filters: [...draft.filters, { field: 'topic', op: 'Eq', value: 'retrieval' }] })}>
              <Plus aria-hidden="true" />
              Add a filter
            </button>
          </fieldset>
          {draftError && (
            <p role="alert" className={controls.error}>
              The source would refuse this query ({draftError}); the results show the last query it accepts.
            </p>
          )}
          <div className={styles.pair}>
            <label className={controls.field}>
              Relax below
              <select value={settings.relax_threshold} onChange={(e) => onSettings({ ...settings, relax_threshold: Number(e.target.value) })}>
                {THRESHOLDS.map((t) => (
                  <option key={t} value={t}>
                    {t} candidate{t === 1 ? '' : 's'}
                    {t === DEFAULT_SETTINGS.relax_threshold ? ' (source default)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className={controls.field}>
              Results wanted
              <select value={settings.limit} onChange={(e) => onSettings({ ...settings, limit: Number(e.target.value) })}>
                {LIMITS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                    {n === DEFAULT_SETTINGS.limit ? ' (source default)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Segmented
            legend="Channels"
            name="search-channels"
            value={settings.hybrid ? 'both' : 'body'}
            options={[
              { value: 'both', label: 'Body + title and tags', note: 'fused' },
              { value: 'body', label: 'Body only' },
            ]}
            onChange={(value) => onSettings({ ...settings, hybrid: value === 'both' })}
          />
        </form>

        <section className={styles.results} aria-label="Search results">
          {!report ? (
            <p className={controls.error}>{run.error}</p>
          ) : (
            <>
              <p className={styles.verdict}>
                <strong data-status={report.status}>{report.status === 'ready' ? 'Ready' : 'Shortfall'}</strong>
                <span>
                  {report.selected.length} of {settings.limit} results
                </span>
              </p>
              <p className={styles.droppedLine}>
                {report.dropped.length ? (
                  <>
                    Dropped to reach {settings.relax_threshold}:{' '}
                    {report.dropped.map((f, i) => (
                      <s key={i}>{formatFilter(f)}</s>
                    ))}
                  </>
                ) : (
                  'No filter dropped.'
                )}
              </p>
              <div className={styles.tableScroll}>
                <table className={styles.hits}>
                  <thead>
                    <tr>
                      <th scope="col">Note</th>
                      <th scope="col">{settings.hybrid ? 'Fused' : 'Body'}</th>
                      <th scope="col">Body</th>
                      <th scope="col">Title, tags</th>
                      <th scope="col">Criteria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.selected.map((hit) => {
                      const doc = DOCS.get(hit.id)!;
                      const broken = new Set(brokenFilters(doc, query).map((f) => f.field));
                      const judged = report.criteria[hit.id];
                      return (
                        <tr key={hit.id} data-broken={broken.size ? '' : undefined}>
                          <th scope="row">
                            <strong>
                              {doc.title}
                              {broken.size > 0 && <em className={styles.outside}>outside the request</em>}
                            </strong>
                            <span>
                              {hit.id} ·{' '}
                              {(['kind', 'collection', 'year'] as const).map((field, i) => (
                                <Fragment key={field}>
                                  {i > 0 && ' · '}
                                  <span data-broken={broken.has(field) || undefined}>{doc[field]}</span>
                                </Fragment>
                              ))}
                            </span>
                          </th>
                          <td className={styles.count}>{fixed(hit.score, settings.hybrid ? 4 : 3)}</td>
                          <td className={styles.count}>{primaryRank.get(hit.id) ?? '—'}</td>
                          <td className={styles.count}>{settings.hybrid ? (secondaryRank.get(hit.id) ?? '—') : 'off'}</td>
                          <td className={styles.criteria}>
                            {judged.hardPass.map((pass, i) => (pass ? <Check key={i} aria-label="hard criterion met" /> : <Minus key={i} aria-label="hard criterion missed" />))}
                            {judged.softScores.length > 0 && <span>soft {judged.softScores.join('+')}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {report.rejected.length > 0 && (
                <p className={styles.rejected}>
                  Rejected by the hard criteria, never padded back in:{' '}
                  {report.rejected.map((c) => DOCS.get(c.id)!.title).join(', ')}.
                </p>
              )}
              <h3>Attempts</h3>
              <ol className={styles.attempts}>
                {report.attempts.map((a, i) => (
                  <li key={i} data-short={a.count < settings.relax_threshold || undefined}>
                    <span className={styles.count}>{a.count}</span> body hit{a.count === 1 ? '' : 's'} under{' '}
                    {a.filters.length ? a.filters.map(formatFilter).join(', ') : 'no filters'}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>

      <details className={styles.corpus}>
        <summary>The eighteen notes</summary>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th scope="col">Note</th>
                <th scope="col">Kind</th>
                <th scope="col">Topic</th>
                <th scope="col">Collection</th>
                <th scope="col">Year</th>
                <th scope="col">Tags</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_CORPUS.map((doc) => (
                <tr key={doc.id}>
                  <th scope="row">
                    {doc.title} <span>{doc.id}</span>
                  </th>
                  <td>{doc.kind}</td>
                  <td>{doc.topic}</td>
                  <td>{doc.collection}</td>
                  <td className={styles.count}>{doc.year}</td>
                  <td>{doc.tags.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

