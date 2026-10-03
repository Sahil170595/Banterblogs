'use client';

import { useState } from 'react';
import { ChevronDown, Download, Play, RotateCcw, Upload } from 'lucide-react';
import { freshCorpus } from '@/lib/projects/retrieval-ranking/corpus';
import {
  DEFAULT_CONFIG, exportRun, parseJson, replayRun, runRetrieval, validateConfig, validateCorpus,
  type Document, type RankedRow, type SearchConfig,
} from '@/lib/projects/retrieval-ranking/engine';
import Evidence, { formatScore } from './Evidence';
import FilterControls, { describeFilter } from './FilterControls';
import styles from './retrieval.module.css';

type View = 'results' | 'rejected' | 'attempts' | 'corpus' | 'replay';
const VIEWS: View[] = ['results', 'rejected', 'attempts', 'corpus', 'replay'];
function initialRun() {
  const corpus = freshCorpus();
  const config = validateConfig(DEFAULT_CONFIG);
  return { corpus, config, result: runRetrieval(corpus, config) };
}
const STATUS = {
  ready: 'Result quota met', shortfall: 'Result quota shortfall', 'empty-query': 'No query tokens',
  'no-matches': 'No lexical matches', 'all-rejected': 'All retrieved documents rejected',
};

function Results({ rows, selected, onSelect, config, docs }: {
  rows: RankedRow[]; selected: string; onSelect: (id: string) => void; config: SearchConfig; docs: Document[];
}) {
  const maximum = Math.max(1e-12, ...rows.map((r) => r.score));
  return <ol className={styles.results}>
    {rows.map((row, i) => {
      const doc = docs.find((d) => d.id === row.id)!;
      const body = config.mode === 'rrf' ? (row.bodyRank ? 1 / (config.rrfK + row.bodyRank) : 0) : config.mode === 'body' ? row.bodyScore : 0;
      const metadata = config.mode === 'rrf' ? (row.metadataRank ? 1 / (config.rrfK + row.metadataRank) : 0) : config.mode === 'metadata' ? row.metadataScore : 0;
      return <li key={row.id}>
        <button className={styles.result} aria-label={`Inspect ${row.id} ${doc.title}`} aria-pressed={selected === row.id} onClick={() => onSelect(row.id)}>
          <span className={styles.rank}>{i + 1}</span><span className={styles.resultContent}>
            <span className={styles.resultTitle}>{doc.title}</span>
            <span className={styles.attributes}>{doc.id} / {doc.year} / {doc.collection}</span>
            <span className={styles.bar} role="img" aria-label={`Ranking score ${formatScore(row.score)}, body contribution ${formatScore(body)}, title and tag contribution ${formatScore(metadata)}`}>
              <span className={styles.bodyBar} style={{ width: `${body / maximum * 100}%` }} /><span className={styles.metadataBar} style={{ width: `${metadata / maximum * 100}%` }} />
            </span>
            {row.violations.length > 0 && <span className={styles.warning}>Relaxed: {row.violations.join(', ')}</span>}
            {row.missingRequired.length > 0 && <span className={styles.warning}>Missing: {row.missingRequired.join(', ')}</span>}
          </span><span className={styles.resultScore}>{formatScore(row.score)}<small>B {row.bodyRank ?? '-'} / M {row.metadataRank ?? '-'}</small></span>
        </button>
      </li>;
    })}
  </ol>;
}

export default function RetrievalDemo() {
  const [applied, setApplied] = useState(initialRun);
  const [draft, setDraft] = useState(() => validateConfig(DEFAULT_CONFIG));
  const [corpusText, setCorpusText] = useState(() => JSON.stringify(freshCorpus(), null, 2));
  const [replayText, setReplayText] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [view, setView] = useState<View>('results');
  const [error, setError] = useState('');
  const [customCorpus, setCustomCorpus] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { corpus, config, result } = applied;
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  const visibleRows = view === 'rejected' ? result.rejected : result.rows;
  const selected = visibleRows.find((r) => r.id === selectedId) ?? visibleRows[0];

  const attempt = (action: () => void) => {
    try { action(); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Retrieval action failed with an unknown error'); }
  };
  const execute = (docs: Document[]) => {
    const next = validateConfig(draft);
    const validated = validateCorpus(docs);
    setApplied({ corpus: validated, config: next, result: runRetrieval(validated, next) });
    setSelectedId('');
    setSettingsOpen(false);
  };
  const reset = () => {
    const next = initialRun(); setApplied(next); setDraft(next.config);
    setCorpusText(JSON.stringify(next.corpus, null, 2)); setReplayText('');
    setSelectedId(''); setView('results'); setError(''); setCustomCorpus(false); setSettingsOpen(false);
  };
  const exportResult = () => attempt(() => {
    const text = exportRun(corpus, config);
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    try {
      const anchor = document.createElement('a'); anchor.href = url;
      anchor.download = 'retrieval-ranking-v1.json'; anchor.click();
    } finally { URL.revokeObjectURL(url); }
    setReplayText(text); setView('replay');
  });
  const replay = () => attempt(() => {
    const next = replayRun(replayText); setApplied(next); setDraft(next.config);
    setCorpusText(JSON.stringify(next.corpus, null, 2)); setSelectedId('');
    setCustomCorpus(JSON.stringify(next.corpus) !== JSON.stringify(freshCorpus()));
  });

  return <section id="demo" className={styles.demo} aria-label="Retrieval ranking workbench">
    <div className={styles.toolbar}>
      <p>{customCorpus ? 'User-supplied corpus' : '18 fictional engineering notes'} <span className={styles.muted}>/ Browser-only lexical retrieval / No models or network calls</span></p>
      <div className={styles.actions}>
        <button onClick={reset} aria-label="Reset experiment" title="Reset experiment"><RotateCcw size={18} /></button>
        <button onClick={exportResult} aria-label="Export run" title="Export applied run as JSON"><Download size={18} /></button>
      </div>
    </div>
    <div className={styles.workbench}>
      <form noValidate className={styles.controls} onSubmit={(e) => { e.preventDefault(); attempt(() => execute(corpus)); }}>
        <div className={styles.searchRow}>
          <label>Query<input value={draft.query} maxLength={240} onChange={(e) => setDraft({ ...draft, query: e.target.value })} /></label>
          <button className={styles.run} type="submit" aria-label="Run retrieval" title="Run retrieval"><Play size={18} /></button>
        </div>
        <button type="button" className={styles.settingsToggle} aria-label="Ranking and filters" aria-expanded={settingsOpen} aria-controls="retrieval-settings" onClick={() => setSettingsOpen(!settingsOpen)}>Ranking &amp; filters ({draft.filters.length})<ChevronDown size={16} /></button>
        <div id="retrieval-settings" className={styles.settingsContent} data-expanded={settingsOpen}>
        <label>Ranking<select value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value as SearchConfig['mode'] })}><option value="rrf">Reciprocal rank fusion</option><option value="body">Body lexical channel</option><option value="metadata">Title + tag channel</option></select></label>
        <FilterControls config={draft} onChange={setDraft} />
        <div className={styles.checks}>
          <label><input type="checkbox" checked={draft.relax} onChange={(e) => setDraft({ ...draft, relax: e.target.checked })} />Relax unprotected filters</label>
          <label><input type="checkbox" checked={draft.preferCoverage} onChange={(e) => setDraft({ ...draft, preferCoverage: e.target.checked })} />Prefer query-token coverage</label>
        </div>
        <div className={styles.numbers}>
          {([
            ['threshold', 'Relaxation target', 100], ['depth', 'Channel depth', 100],
            ['rrfK', 'RRF constant', 200], ['limit', 'Display limit', 100], ['minimum', 'Result quota', 100],
          ] as const).map(([key, label, max]) => <label key={key}>{label}<input type="number" min="1" max={max} value={Number.isNaN(draft[key]) ? '' : draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>)}
        </div>
        <label>Required tokens<input value={draft.requiredTerms} maxLength={120} onChange={(e) => setDraft({ ...draft, requiredTerms: e.target.value })} /></label>
        </div>
        <p className={styles.draftState}>{dirty ? 'Unapplied changes' : 'Configuration applied'}</p>
      </form>
      <div className={styles.output}>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.summary} aria-live="polite">
          <strong className={result.status === 'ready' ? styles.good : styles.warning}>{STATUS[result.status]}</strong>
          <span>{result.rows.length} shown / {result.acceptedCount} eligible / {result.rejected.length} rejected</span>
          <span>Body pool {result.bodyIds.length} / target {config.threshold} {result.thresholdMet ? 'met' : 'not met'}</span>
          {result.truncated > 0 && <span>{result.truncated} eligible documents outside display limit</span>}
        </div>
        <div className={styles.finalFilters}><strong>Final filters</strong>{result.finalFilters.length ? result.finalFilters.map((f) => <span key={f.field}>{describeFilter(f)}</span>) : <span>None</span>}</div>
        <div role="tablist" aria-label="Inspection views" className={styles.tabs}>
          {VIEWS.map((tab, index) => <button type="button" role="tab" key={tab} id={`tab-${tab}`} tabIndex={view === tab ? 0 : -1} aria-selected={view === tab} aria-controls={`panel-${tab}`} onClick={() => setView(tab)} onKeyDown={(e) => {
            const offset = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!offset && e.key !== 'Home' && e.key !== 'End') return;
            e.preventDefault();
            const next = e.key === 'Home' ? VIEWS[0] : e.key === 'End' ? VIEWS[VIEWS.length - 1] : VIEWS[(index + offset + VIEWS.length) % VIEWS.length];
            setView(next); document.getElementById(`tab-${next}`)?.focus();
          }}>{tab === 'rejected' ? `Rejected (${result.rejected.length})` : tab[0].toUpperCase() + tab.slice(1)}</button>)}
        </div>
        <div role="tabpanel" id={`panel-${view}`} aria-labelledby={`tab-${view}`} className={styles.panel}>
          {(view === 'results' || view === 'rejected') && <>
            <div className={styles.sectionHeading}><h3>{view === 'results' ? 'Ranked documents' : 'Rejected documents'}</h3><span>{config.mode === 'rrf' ? 'RRF score' : config.mode === 'body' ? 'Body score' : 'Title + tag score'}</span></div>
            <div className={styles.legend}><span><i className={styles.bodyBar} />Body</span><span><i className={styles.metadataBar} />Title + tags</span></div>
            <Results rows={view === 'results' ? result.rows : result.rejected} selected={selected?.id ?? ''} onSelect={setSelectedId} config={config} docs={corpus} />
            {(view === 'results' ? result.rows : result.rejected).length === 0 && <p className={styles.empty}>No documents in this view</p>}
          </>}
          {view === 'attempts' && <div className={styles.tableScroll}><table aria-label="Filter attempts"><thead><tr><th>Attempt</th><th>Active filters</th><th>Attribute matches</th><th>Body hits after depth</th></tr></thead><tbody>{result.attempts.map((a, i) => <tr key={i}><th scope="row">{a.dropped ? `Drop ${a.dropped.field}` : 'Initial'}</th><td>{a.activeFilters.map(describeFilter).join('; ') || 'None'}</td><td>{a.attributeCount}</td><td>{a.bodyCount}</td></tr>)}</tbody></table></div>}
          {view === 'corpus' && <div className={styles.jsonEditor}><label>Corpus JSON<textarea spellCheck={false} value={corpusText} onChange={(e) => setCorpusText(e.target.value)} /></label><button onClick={() => attempt(() => { const docs = validateCorpus(parseJson(corpusText)); execute(docs); setCustomCorpus(true); setView('results'); })}><Play size={16} />Apply corpus</button></div>}
          {view === 'replay' && <div className={styles.jsonEditor}><label>Replay JSON<textarea spellCheck={false} value={replayText} onChange={(e) => setReplayText(e.target.value)} /></label><button onClick={replay}><Upload size={16} />Replay run</button></div>}
        </div>
        {selected && (view === 'results' || view === 'rejected') && <Evidence row={selected} doc={corpus.find((d) => d.id === selected.id)!} config={config} />}
      </div>
    </div>
  </section>;
}
