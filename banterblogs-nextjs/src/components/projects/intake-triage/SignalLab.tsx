'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Check, Download, Minus, RotateCcw, Upload } from 'lucide-react';
import { FIXTURES } from '@/lib/projects/intake-triage/fixtures';
import { PRIORITY_SIGNALS, valueOf, withValue, type PrioritySignal } from '@/lib/projects/intake-triage/influence';
import { alternatives, REFERENCE_SIGNALS } from '@/lib/projects/intake-triage/lab';
import { makeReceipt, MAX_RECEIPT_BYTES, replayReceipt } from '@/lib/projects/intake-triage/receipt';
import { P1_AT, P3_AT, scoreSignals, signed } from '@/lib/projects/intake-triage/score';
import { CLASSIFICATION_LABELS, type Signals } from '@/lib/projects/intake-triage/signals';
import { controls, Segmented } from '../controls';
import styles from './triage.module.css';

const GATE_LABELS = {
  P0_safeguarding: 'Caregiving-harm gate',
  P1_noncaregiving_safety: 'Non-caregiving safety gate',
  operational: 'Operational score',
} as const;
const SAFETY_IDS = ['safeguarding_hit', 'safety_severity', 'safety_is_caregiving'];
/** the lab opens on a same-day reschedule: two signals say same-day, so neither alone decides */
export const OPENING_FIXTURE = FIXTURES.find((f) => f.id === 'schedule')!;
const byId = (id: string) => PRIORITY_SIGNALS.find((s) => s.id === id)!;
const label = (value: boolean | string) => (value === true ? 'Yes' : value === false ? 'No' : String(value).replace(/_/g, ' '));

/** one control, each option noting what choosing it would change */
function SignalControl({ signal, signals, focused, onChange }: { signal: PrioritySignal; signals: Signals; focused: boolean; onChange: (next: Signals) => void }) {
  const current = valueOf(signals, signal);
  const options = alternatives(signals, signal);
  const note = (o: (typeof options)[number]) =>
    o.changes === 'urgency' ? o.urgency : o.changes === 'classification' ? CLASSIFICATION_LABELS[o.classification].toLowerCase() : undefined;
  if (signal.id === 'classification') {
    return (
      <label className={controls.field} data-focus={focused || undefined}>
        {signal.label}
        <select value={String(current)} onChange={(event) => onChange(withValue(signals, signal, event.target.value))}>
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {CLASSIFICATION_LABELS[o.value as keyof typeof CLASSIFICATION_LABELS]}
              {note(o) ? ` · ${note(o)}` : ''}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div data-focus={focused || undefined}>
      <Segmented
        legend={signal.label}
        name={`signal-${signal.id}`}
        value={String(current)}
        options={options.map((o) => ({ value: String(o.value), label: label(o.value), note: note(o) }))}
        onChange={(value) => onChange(withValue(signals, signal, signal.values.find((v) => String(v) === value)!))}
      />
    </div>
  );
}

export function SignalLab({
  signals,
  fixtureId,
  focus,
  onSignals,
}: {
  signals: Signals;
  fixtureId: string | null;
  focus: string | null;
  onSignals: (signals: Signals, fixtureId: string | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const result = scoreSignals(signals);
  const fixture = FIXTURES.find((f) => f.id === fixtureId) ?? null;
  const change = (next: Signals) => {
    revision.current++;
    setError(null);
    setStatus('');
    onSignals(next, null);
  };

  function exportReceipt() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(makeReceipt(signals), null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'intake-triage.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Signals and decision exported');
  }

  async function importReceipt(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const mine = ++revision.current;
    try {
      if (file.size > MAX_RECEIPT_BYTES) throw new Error(`The file is over ${MAX_RECEIPT_BYTES / 1000} KB.`);
      const text = await file.text();
      if (mine !== revision.current) return;
      onSignals(replayReceipt(JSON.parse(text)), null);
      setError(null);
      setStatus('File rescored: its decision follows from its signals');
    } catch (cause) {
      if (mine !== revision.current) return;
      console.warn('Intake triage file refused', cause);
      setError(`File refused: ${cause instanceof Error ? cause.message : 'it could not be read.'}`);
    } finally {
      input.value = '';
    }
  }

  return (
    <div className={styles.lab}>
      <div className={styles.toolbar}>
        <label className={controls.field}>
          Start from a fixture message
          <select
            value={fixtureId ?? 'custom'}
            onChange={(event) => {
              const next = FIXTURES.find((f) => f.id === event.target.value);
              if (!next) return;
              revision.current++;
              setError(null);
              setStatus('');
              onSignals(next.signals, next.id);
            }}
          >
            {fixtureId === null && <option value="custom">Your own signals</option>}
            {FIXTURES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.subject}: {f.note}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.commands}>
          <button type="button" className={controls.iconButton} aria-label="Export signals and decision" title="Export signals and decision" onClick={exportReceipt}>
            <Download aria-hidden="true" />
          </button>
          <button type="button" className={controls.iconButton} aria-label="Import a file" title="Import a file" onClick={() => fileRef.current?.click()}>
            <Upload aria-hidden="true" />
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Signals file" onChange={importReceipt} />
          <button
            type="button"
            className={controls.iconButton}
            aria-label="Reset to the opening message"
            title="Reset to the opening message"
            onClick={() => {
              revision.current++;
              setError(null);
              setStatus('');
              onSignals(OPENING_FIXTURE.signals, OPENING_FIXTURE.id);
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

      <div className={styles.workspace}>
        <form className={styles.signals} aria-label="Signals" onSubmit={(event) => event.preventDefault()}>
          <p className={controls.hint}>Each option shows what choosing it would change: a priority, or else a classification.</p>
          <fieldset>
            <legend>Safety</legend>
            {SAFETY_IDS.map((id) => (
              <SignalControl key={id} signal={byId(id)} signals={signals} focused={focus === id} onChange={change} />
            ))}
          </fieldset>
          <fieldset>
            <legend>Operational</legend>
            {PRIORITY_SIGNALS.filter((s) => !SAFETY_IDS.includes(s.id)).map((signal) => (
              <SignalControl key={signal.id} signal={signal} signals={signals} focused={focus === signal.id} onChange={change} />
            ))}
          </fieldset>
          <details>
            <summary>Referral references, read only by the classification</summary>
            <fieldset>
              <legend className={styles.srOnly}>Referral references</legend>
              {REFERENCE_SIGNALS.map((signal) => (
                <SignalControl key={signal.id} signal={signal} signals={signals} focused={false} onChange={change} />
              ))}
            </fieldset>
          </details>
        </form>

        <section className={styles.result} aria-label="Scorer decision">
          <div className={styles.verdict}>
            <output aria-label="Priority" data-urgency={result.urgency}>
              {result.urgency}
            </output>
            <div>
              <strong>{GATE_LABELS[result.gate]}</strong>
              <span>
                {CLASSIFICATION_LABELS[result.classification]}
                {result.classification !== signals.llm.classification && ` (proposed: ${CLASSIFICATION_LABELS[signals.llm.classification].toLowerCase()})`}
              </span>
              <span>{result.escalation ? 'Escalated for same-hour review' : 'No escalation'} · human review required</span>
            </div>
          </div>
          {fixture && (
            <p className={styles.agreement}>
              Intakegate&apos;s own scorer gave this message {fixture.source.urgency}, {CLASSIFICATION_LABELS[fixture.source.classification].toLowerCase()}
              {fixture.source.urgency === result.urgency && fixture.source.classification === result.classification ? ': the same.' : '.'}
            </p>
          )}
          <h3>Operational score</h3>
          {result.score === null ? (
            <p className={styles.muted}>Not summed: a safety gate decided first.</p>
          ) : (
            <table className={styles.nudges}>
              <tbody>
                {result.nudges.map((nudge) => (
                  <tr key={nudge.id} data-fired={nudge.fired || undefined}>
                    <td>{nudge.fired ? <Check aria-label="fired" /> : <Minus aria-label="not fired" />}</td>
                    <th scope="row">{nudge.label}</th>
                    <td>{signed(nudge.weight)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  <th scope="row">
                    Score; P1 at {signed(P1_AT)}, P3 at {signed(P3_AT)}
                  </th>
                  <td>{signed(result.score)}</td>
                </tr>
              </tfoot>
            </table>
          )}
          <h3>Why</h3>
          <ol className={styles.reasons}>
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
