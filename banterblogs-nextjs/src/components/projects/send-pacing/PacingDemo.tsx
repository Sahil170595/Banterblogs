'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ChevronLeft, ChevronRight, Download, RotateCcw, Upload } from 'lucide-react';
import { makeReceipt, MAX_RECEIPT_BYTES, replayReceipt } from '@/lib/projects/send-pacing/receipt';
import { runReplay, SOURCE_REPLAY, type Replay } from '@/lib/projects/send-pacing/scheduler';
import type { SweepRow } from '@/lib/projects/send-pacing/sweep';
import { controls } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
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

/**
 * The send pacing page's live demo: what a seed sweep finds, the schedule of
 * one replay drawn over its campaign, and its ledger, all from the ported
 * scheduler. The sweep is computed on the server and passed in.
 */
export function PacingDemo({ sweep, seeds }: { sweep: SweepRow[]; seeds: number }) {
  const [replay, setReplay] = useState<Replay>(SOURCE_REPLAY);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const result = useMemo(() => runReplay(replay), [replay]);
  const source = sweep[0];
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

  return (
    <div className={styles.demo}>
      <div className={styles.hero}>
        <p className={styles.headline}>
          Across {count(seeds)} seeds of the source&apos;s own replay, twelve messages over two hours,{' '}
          {source.lastTwoLate === seeds ? 'every schedule sends its' : `${count(source.lastTwoLate)} schedules send their`} last two messages before
          they could have been typed, and {count(source.burst)} also break{source.burst === 1 ? 's' : ''} the burst limit.
        </p>
        <p className={styles.runLine}>
          <span>Seed {replay.seed}</span> {replay.count} messages, {clock(result.start).slice(0, 5)} to {clock(result.end).slice(0, 5)} UTC ·{' '}
          {late ? `${words[late] ?? late} sent before ${late === 1 ? 'it was' : 'they were'} typed` : 'every message typed before it went'}
          {atEnd > 1 && ` · ${words[atEnd] ?? atEnd} at the campaign's final instant`}
        </p>
        <ProjectFigureTransition slug="send-pacing">
          <Timeline result={result} />
        </ProjectFigureTransition>
        <div className={styles.seedRow}>
          <button
            type="button"
            className={controls.iconButton}
            aria-label="Previous seed"
            disabled={replay.seed === 0}
            onClick={() => set({ seed: replay.seed - 1 })}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
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
          <button
            type="button"
            className={controls.iconButton}
            aria-label="Next seed"
            disabled={replay.seed === MAX_SEED}
            onClick={() => set({ seed: replay.seed + 1 })}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.tableScroll} role="region" aria-label={`What ${count(seeds)} seeds find`} tabIndex={0}>
        <table className={styles.sweep}>
          <thead>
            <tr>
              <th scope="col">Replay</th>
              <th scope="col">Sent before typed</th>
              <th scope="col">Over the burst limit</th>
              <th scope="col">Outside business hours</th>
              <th scope="col">At the final instant</th>
            </tr>
          </thead>
          <tbody>
            {sweep.map((row) => (
              <tr key={row.label} data-selected={same(row.replay, replay) || undefined}>
                <th scope="row">
                  <button type="button" aria-pressed={same(row.replay, replay)} onClick={() => set(row.replay)}>
                    {row.label}
                  </button>
                </th>
                <td>
                  {count(row.beforePreparation)} of {count(seeds)}
                </td>
                <td>
                  {count(row.burst)} of {count(seeds)}
                </td>
                <td>
                  {count(row.afterHours)} of {count(seeds)}
                </td>
                <td>{row.atEnd.toFixed(1)} a run</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            <button type="button" className={controls.iconButton} aria-label="Export the replay" title="Export the replay" onClick={exportRun}>
              <Download aria-hidden="true" />
            </button>
            <button type="button" className={controls.iconButton} aria-label="Import a replay" title="Import a replay" onClick={() => fileRef.current?.click()}>
              <Upload aria-hidden="true" />
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Replay file" onChange={importRun} />
            <button
              type="button"
              className={controls.iconButton}
              aria-label="Reset to the source replay"
              title="Reset to the source replay"
              onClick={() => {
                revision.current++;
                setError(null);
                setStatus('');
                load(SOURCE_REPLAY);
              }}
            >
              <RotateCcw aria-hidden="true" />
            </button>
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
    </div>
  );
}
