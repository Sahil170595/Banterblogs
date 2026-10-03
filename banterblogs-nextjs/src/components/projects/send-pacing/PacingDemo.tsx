'use client';

import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Download, RotateCcw, Upload } from 'lucide-react';
import { makeReceipt, MAX_RECEIPT_BYTES, replayReceipt } from '@/lib/projects/send-pacing/receipt';
import { runReplay, SOURCE_REPLAY, SOURCE_SETTINGS, type Replay } from '@/lib/projects/send-pacing/scheduler';
import type { SweepRow } from '@/lib/projects/send-pacing/sweep';
import { controls, UnderTheHood } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import { revealResult } from '../reveal';
import { clock } from './format';
import { Ledger } from './Ledger';
import { Timeline } from './Timeline';
import styles from './pacing.module.css';

const COUNTS = [4, 6, 8, 12, 16, 24, 32, 48];
const DURATIONS = [1, 2, 4, 8];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MAX_SEED = 0xffffffff;
const count = (n: number) => n.toLocaleString('en-US');
const words = ['none', 'one', 'two', 'three', 'four', 'five'];
const same = (a: Omit<Replay, 'seed'>, b: Replay) => a.count === b.count && a.durationHours === b.durationHours && a.startHour === b.startHour;

export const SWEEP_COLUMNS = {
  setup: 'Setup',
  late: 'Runs with a message sent before it was typed',
  burst: 'Runs over the burst limit',
  afterHours: 'Runs with a send outside business hours',
  atEnd: 'Messages at the final instant, average per run',
} as const;

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={controls.iconButton} aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {children}
      <span className={controls.iconLabel}>{label}</span>
    </button>
  );
}

/**
 * The send pacing page's live demo: one replay's schedule drawn over its
 * campaign, what a seed sweep finds for each setup, and the replay's ledger
 * under the hood, all from the ported scheduler. The sweep is computed on the
 * server and passed in.
 */
export function PacingDemo({ sweep, seeds }: { sweep: SweepRow[]; seeds: number }) {
  const [replay, setReplay] = useState<Replay>(SOURCE_REPLAY);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const revision = useRef(0);
  const result = useMemo(() => runReplay(replay), [replay]);
  const late = result.violations.filter((v) => v.code === 'before_preparation').length;
  const atEnd = result.schedule.filter((r) => r.sendTime === result.end).length;
  const [seedText, setSeedText] = useState(String(SOURCE_REPLAY.seed));
  const load = (next: Replay) => {
    setReplay(next);
    setSeedText(String(next.seed));
  };
  const set = (next: Partial<Replay>) => {
    revision.current++;
    setError(null);
    setStatus('');
    load({ ...replay, ...next });
  };

  function exportRun() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(makeReceipt(replay), null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'send-pacing.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Parameters, send times and findings exported');
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
      load(replayReceipt(JSON.parse(text)));
      setError(null);
      setStatus('File rerun: its send times follow from its parameters');
    } catch (cause) {
      if (mine !== revision.current) return;
      console.warn('Send pacing file refused', cause);
      setError(`File refused: ${cause instanceof Error ? cause.message : 'it could not be read.'}`);
    } finally {
      input.value = '';
    }
  }

  const say = (n: number) => words[n] ?? String(n);
  return (
    <div className={styles.demo}>
      <div className={styles.hero}>
        <p className={styles.headline}>
          {late === 0
            ? `In this run of ${replay.count} messages, every one is typed before it goes.`
            : `In this run of ${replay.count} messages, ${say(late)} go${late === 1 ? 'es' : ''} out before ${late === 1 ? 'it' : 'they'} could have been typed${
                atEnd > 1 ? `, and ${say(atEnd)} land on the campaign’s final instant, ${clock(result.end).slice(0, 5)}` : ''
              }.`}
        </p>
        <p className={controls.lead}>
          Each row is one message, in send order. The scheduler prepares each message from the previous send and should wait at least as long as
          typing it would take; a red tick is a message sent before that. A seed fixes the random draws, so each seed is one reproducible run: step
          through them below, or pick a setup in the table to chart it.
        </p>
        <p className={styles.runLine}>
          <span>Seed {replay.seed}</span> {replay.count} messages, {clock(result.start).slice(0, 5)} to {clock(result.end).slice(0, 5)} UTC ·{' '}
          {late ? `${say(late)} sent before ${late === 1 ? 'it was' : 'they were'} typed` : 'every message typed before it went'}
          {atEnd > 1 && ` · ${say(atEnd)} at the campaign's final instant`}
        </p>
        <div ref={chartRef} className={styles.chartAnchor}>
          <ProjectFigureTransition slug="send-pacing">
            <Timeline result={result} />
          </ProjectFigureTransition>
        </div>
        <div className={styles.seedRow}>
          <IconButton label="Previous seed" disabled={replay.seed === 0} onClick={() => set({ seed: replay.seed - 1 })}>
            <ChevronLeft aria-hidden="true" />
          </IconButton>
          <label className={controls.field}>
            Seed
            <input
              inputMode="numeric"
              value={seedText}
              onChange={(e) => {
                setSeedText(e.target.value);
                const seed = Number(e.target.value);
                if (e.target.value.trim() !== '' && Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED) set({ seed });
              }}
              onBlur={() => setSeedText(String(replay.seed))}
            />
          </label>
          <IconButton label="Next seed" disabled={replay.seed === MAX_SEED} onClick={() => set({ seed: replay.seed + 1 })}>
            <ChevronRight aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <section className={styles.sweepBlock} aria-labelledby="pacing-sweep-title">
        <h3 id="pacing-sweep-title" className={styles.blockTitle}>
          What {count(seeds)} random runs find for each setup
        </h3>
        <p className={controls.hint}>
          Pick a setup to chart it above. The burst limit is the scheduler’s own: no more than {SOURCE_SETTINGS.maxBurst} sends within{' '}
          {SOURCE_SETTINGS.burstWindowSeconds} seconds.
        </p>
        <div className={styles.tableScroll} role="region" aria-label={`What ${count(seeds)} seeds find`} tabIndex={0}>
          <table className={`${styles.sweep} ${controls.stackTable}`} role="table">
            <thead role="rowgroup">
              <tr role="row">
                {Object.values(SWEEP_COLUMNS).map((name) => (
                  <th key={name} scope="col" role="columnheader">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {sweep.map((row) => (
                <tr key={row.label} role="row" data-selected={same(row.replay, replay) || undefined}>
                  <th scope="row" role="rowheader">
                    <button
                      type="button"
                      aria-pressed={same(row.replay, replay)}
                      onClick={() => {
                        set(row.replay);
                        revealResult(chartRef.current);
                      }}
                    >
                      {row.label}
                    </button>
                  </th>
                  <td role="cell" data-label={SWEEP_COLUMNS.late}>
                    {count(row.beforePreparation)} of {count(seeds)}
                  </td>
                  <td role="cell" data-label={SWEEP_COLUMNS.burst}>
                    {count(row.burst)} of {count(seeds)}
                  </td>
                  <td role="cell" data-label={SWEEP_COLUMNS.afterHours}>
                    {count(row.afterHours)} of {count(seeds)}
                  </td>
                  <td role="cell" data-label={SWEEP_COLUMNS.atEnd}>
                    {row.atEnd.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <UnderTheHood summary="Change the campaign, read every message’s timing, export a replay">
        <div className={styles.lab}>
          <div className={styles.toolbar}>
            <div className={styles.settings}>
              <label className={controls.field}>
                Messages
                <select value={replay.count} onChange={(e) => set({ count: Number(e.target.value) })}>
                  {COUNTS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className={controls.field}>
                Campaign
                <select value={replay.durationHours} onChange={(e) => set({ durationHours: Number(e.target.value) })}>
                  {DURATIONS.map((h) => (
                    <option key={h} value={h}>
                      {h} hour{h === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </label>
              <label className={controls.field}>
                Starts at
                <select value={replay.startHour} onChange={(e) => set({ startHour: Number(e.target.value) })}>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00 UTC
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.commands}>
              <IconButton label="Export the replay" onClick={exportRun}>
                <Download aria-hidden="true" />
              </IconButton>
              <IconButton label="Import a replay" onClick={() => fileRef.current?.click()}>
                <Upload aria-hidden="true" />
              </IconButton>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Replay file" onChange={importRun} />
              <IconButton
                label="Reset to the source replay"
                onClick={() => {
                  revision.current++;
                  setError(null);
                  setStatus('');
                  load(SOURCE_REPLAY);
                }}
              >
                <RotateCcw aria-hidden="true" />
              </IconButton>
            </div>
          </div>
          {error && (
            <p role="alert" className={controls.error}>
              {error}
            </p>
          )}
          <p role="status" className={controls.hint}>
            {status}
          </p>
          <Ledger result={result} />
        </div>
      </UnderTheHood>
    </div>
  );
}
