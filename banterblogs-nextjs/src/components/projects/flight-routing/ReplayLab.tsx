'use client';

import { useState, type FormEvent, type Ref } from 'react';
import { ChevronLeft, ChevronRight, Download, Play, RotateCcw, SkipForward, Undo2 } from 'lucide-react';
import {
  actionValues,
  comparePolicies,
  CONFIG_LIMITS,
  exportTrace,
  formatTime,
  POLICIES,
  POLICY_LABELS,
  REWARD_WEIGHTS,
  type Config,
  type Policy,
  type Reason,
} from '@/lib/projects/flight-routing/engine';
import { getScenario, outcomePool } from '@/lib/projects/flight-routing/fixtures';
import { EXPERIMENT_WORLDS } from '@/lib/projects/flight-routing/experiment';
import { worldSeed } from '@/lib/projects/flight-routing/worlds';
import { clockOf, rewardNote } from './copy';
import { RouteFigure } from './RouteFigure';
import { Timeline } from './Timeline';
import type { FlightDemo } from './useFlightDemo';
import { controls, UnderTheHood } from '../controls';
import styles from './demo.module.css';

const REASON_TEXT: Record<Reason, string> = {
  in_progress: 'In progress',
  arrived: 'Arrived',
  cancelled: 'Cancelled',
  unresolved_diversion: 'Diverted',
  horizon: 'Out of time',
  max_attempts: 'Out of attempts',
  no_candidates: 'No onward flight',
  invalid_action: 'Invalid action',
  invalid_outcome: 'Invalid outcome',
  missed_departure: 'Missed departure',
};
const PERCENT = 100;

type Field = 'seed' | 'deadline' | 'horizon' | 'buffer' | 'maxAttempts';
/** label: the field's name on screen; name: how a message refers to it; clock: a minutes-after-midnight field */
const FIELDS: { key: Field; label: string; name: string; clock?: boolean }[] = [
  { key: 'seed', label: 'First world seed', name: 'First world seed' },
  { key: 'deadline', label: 'Deadline (minutes after 00:00)', name: 'Deadline', clock: true },
  { key: 'horizon', label: 'Horizon (minutes after 00:00)', name: 'Horizon', clock: true },
  { key: 'buffer', label: 'Connection buffer (minutes)', name: 'Connection buffer' },
  { key: 'maxAttempts', label: 'Flight attempts', name: 'Flight attempts' },
];

const draftOf = (config: Config) => Object.fromEntries(FIELDS.map(({ key }) => [key, String(config[key])])) as Record<Field, string>;

function Settings({ config, onApply }: { config: Config; onApply: (config: Config) => string | null }) {
  const [draft, setDraft] = useState(() => draftOf(config));
  const [error, setError] = useState('');
  const apply = (event: FormEvent) => {
    event.preventDefault();
    const next = { ...config };
    for (const { key, name } of FIELDS) {
      const value = Number(draft[key]);
      if (!draft[key].trim() || !Number.isInteger(value)) {
        console.warn('Flight routing settings rejected:', `${name} is not a whole number`, draft);
        setError(`${name} must be a whole number.`);
        return;
      }
      next[key] = value;
    }
    setError(onApply(next) ?? '');
  };
  return (
    <form onSubmit={apply} noValidate className={styles.settingsForm} aria-label="World settings">
      {FIELDS.map(({ key, label, clock }) => {
        const reading = clock ? clockOf(draft[key]) : null;
        return (
          <label key={key} className={controls.field}>
            {label}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name={key}
              value={draft[key]}
              aria-describedby="flight-settings-limits"
              onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
            />
            {reading && <span className={styles.clockReading}>= {reading}</span>}
          </label>
        );
      })}
      <button type="submit" className={controls.button}>
        Apply to all worlds
      </button>
      <p id="flight-settings-limits" className={controls.hint}>
        Deadline {CONFIG_LIMITS.deadline[0]}–{CONFIG_LIMITS.deadline[1]} and no later than the horizon; buffer {CONFIG_LIMITS.buffer[0]}–
        {CONFIG_LIMITS.buffer[1]}; {CONFIG_LIMITS.maxAttempts[0]}–{CONFIG_LIMITS.maxAttempts[1]} attempts.
      </p>
      {error && (
        <p role="alert" className={controls.error}>
          {error}
        </p>
      )}
    </form>
  );
}

export function ReplayLab({ demo, ref }: { demo: FlightDemo; ref?: Ref<HTMLElement> }) {
  const { config, selection, history, state, flights, chosen } = demo;
  const [notice, setNotice] = useState('');
  const destination = getScenario(state.config.scenario).destination;
  const terminal = state.reason !== 'in_progress';
  const outcome = !terminal ? 'running' : state.reason !== 'arrived' ? 'failed' : state.reward.deadline > 0 ? 'on-time' : 'late';
  const values = terminal ? [] : actionValues(state);
  const index = selection.index;

  const exportJson = () => {
    try {
      const blob = new Blob([exportTrace(state, comparePolicies(config, EXPERIMENT_WORLDS))], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `flight-routing-seed-${state.config.seed}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice('Trace exported.');
    } catch (cause) {
      console.error('Flight routing trace export failed:', cause);
      setNotice('The trace could not be exported.');
    }
  };

  return (
    <section ref={ref} className={styles.replay} aria-label={`Replay: world ${index + 1} of ${EXPERIMENT_WORLDS}`}>
      <div className={styles.replayHead}>
        <div>
          <h3 className={styles.replayTitle}>
            World {index + 1} <span>of {EXPERIMENT_WORLDS}</span>
          </h3>
          <p className={styles.replayMeta}>
            Seed {worldSeed(config, index)} · {POLICY_LABELS[selection.policy]} · {history.length - 1}{' '}
            {history.length === 2 ? 'decision' : 'decisions'}
          </p>
        </div>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={controls.iconButton}
            aria-label="Previous world"
            disabled={index === 0}
            onClick={() => demo.select({ ...selection, index: index - 1 })}
          >
            <ChevronLeft aria-hidden="true" />
            <span className={controls.iconLabel}>Previous world</span>
          </button>
          <button
            type="button"
            className={controls.iconButton}
            aria-label="Next world"
            disabled={index === EXPERIMENT_WORLDS - 1}
            onClick={() => demo.select({ ...selection, index: index + 1 })}
          >
            <ChevronRight aria-hidden="true" />
            <span className={controls.iconLabel}>Next world</span>
          </button>
          <label className={controls.field}>
            <span>Policy</span>
            <select value={selection.policy} onChange={(event) => demo.select({ ...selection, policy: event.target.value as Policy })}>
              {POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {POLICY_LABELS[policy]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <dl className={styles.status} aria-live="polite" aria-atomic="true">
        <div>
          <dt>Status</dt>
          <dd data-testid="episode-status" data-outcome={outcome}>
            {state.reason === 'arrived' ? (outcome === 'on-time' ? 'Arrived on time' : 'Arrived late') : REASON_TEXT[state.reason]}
          </dd>
        </div>
        <div>
          <dt>Passenger</dt>
          <dd>{terminal ? `At ${state.airport}` : `${state.airport} → ${destination}`}</dd>
        </div>
        <div>
          <dt>Clock / deadline</dt>
          <dd>
            {formatTime(state.clock)} / {formatTime(state.config.deadline)}
          </dd>
        </div>
        <div>
          <dt>Attempts</dt>
          <dd>
            {state.legs.length} of {state.config.maxAttempts} allowed
          </dd>
        </div>
        <div>
          <dt>Reward (out of 1)</dt>
          <dd>{state.reward.total.toFixed(4)}</dd>
        </div>
      </dl>

      <div className={styles.replayBody}>
        <div className={styles.figures}>
          <RouteFigure state={state} chosenId={flights[chosen]?.id} />
          <Timeline state={state} />
        </div>

        <div className={styles.decision}>
          {terminal ? (
            <section aria-labelledby="flight-trace">
              <h4 id="flight-trace">What happened</h4>
              <ol className={styles.trace}>
                {state.legs.map((leg, i) => (
                  <li key={`${leg.flight.id}-${i}`}>
                    <strong>
                      {leg.flight.id} {leg.flight.origin} → {leg.flight.dest}
                    </strong>
                    <span>
                      {leg.outcome.cancelled
                        ? 'Cancelled; the passenger stays put.'
                        : leg.outcome.diverted
                          ? leg.outcome.reached
                            ? `Diverted but reached ${leg.flight.dest} at ${formatTime(leg.arrival!)}.`
                            : `Diverted to ${leg.resolvedAirport}; never confirmed at ${leg.flight.dest}.`
                          : `Left ${formatTime(leg.departure!)}, landed ${formatTime(leg.arrival!)}${leg.outcome.arrDelay ? `, ${leg.outcome.arrDelay} min late` : ''}.`}
                    </span>
                  </li>
                ))}
                {state.legs.length === 0 && <li>No flight taken.</li>}
              </ol>
            </section>
          ) : (
            <section aria-labelledby="flight-choices">
              <h4 id="flight-choices">Bookable now</h4>
              <div className={styles.tableScroll} role="region" aria-label="Bookable flights" tabIndex={0}>
                <table className={controls.stackTable} role="table">
                  <thead role="rowgroup">
                    <tr role="row">
                      <th scope="col" role="columnheader">
                        Flight
                      </th>
                      <th scope="col" role="columnheader">
                        Departs
                      </th>
                      <th scope="col" role="columnheader">
                        Arrives
                      </th>
                      <th scope="col" role="columnheader">
                        Cancels
                      </th>
                      <th scope="col" role="columnheader">
                        Chance of making the deadline
                      </th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {flights.map((flight, i) => {
                      const pool = outcomePool(flight, state.config.profile);
                      return (
                        <tr key={flight.id} role="row" data-chosen={i === chosen || undefined}>
                          <td role="cell" data-label="Flight">
                            <label className={styles.radio}>
                              <input
                                type="radio"
                                name="flight"
                                checked={i === chosen}
                                onChange={() => demo.choose(flight.id)}
                                aria-label={`Choose ${flight.id} to ${flight.dest}`}
                              />
                              {flight.id} → {flight.dest}
                            </label>
                          </td>
                          <td role="cell" data-label="Departs">
                            {formatTime(flight.depart)}
                          </td>
                          <td role="cell" data-label="Arrives">
                            {formatTime(flight.arrive)}
                          </td>
                          <td role="cell" data-label="Cancels">
                            {Math.round((pool.filter((o) => o.cancelled).length / pool.length) * PERCENT)}%
                          </td>
                          <td role="cell" data-label="Chance of making the deadline">
                            {Math.round(values[i] * PERCENT)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className={styles.actions}>
            {!terminal && (
              <>
                <button type="button" className={controls.button} onClick={demo.stepChosen}>
                  <SkipForward aria-hidden="true" />
                  {flights.length ? `Take ${flights[chosen].id}` : 'End the trip: nothing bookable'}
                </button>
                <button type="button" className={controls.button} onClick={demo.finish}>
                  <Play aria-hidden="true" />
                  Let the policy finish
                </button>
              </>
            )}
            {terminal && history.length > 1 && <p className={controls.hint}>Rewind to take another flight in this same world.</p>}
            <button
              type="button"
              className={controls.iconButton}
              aria-label="Rewind one decision"
              title="Rewind one decision"
              disabled={history.length < 2}
              onClick={demo.rewind}
            >
              <Undo2 aria-hidden="true" />
              <span className={controls.iconLabel}>Rewind one decision</span>
            </button>
            <button
              type="button"
              className={controls.iconButton}
              aria-label="Restart this world"
              title="Restart this world"
              disabled={history.length < 2}
              onClick={demo.restart}
            >
              <RotateCcw aria-hidden="true" />
              <span className={controls.iconLabel}>Restart this world</span>
            </button>
          </div>

          <dl className={styles.rewards} role="group" aria-label="Reward">
            <div>
              <dt>On time</dt>
              <dd>
                {state.reward.deadline.toFixed(4)} <span>/ {REWARD_WEIGHTS.deadline.toFixed(2)}</span>
              </dd>
            </div>
            <div>
              <dt>Arrived</dt>
              <dd>
                {state.reward.arrival.toFixed(4)} <span>/ {REWARD_WEIGHTS.arrival.toFixed(2)}</span>
              </dd>
            </div>
            <div>
              <dt>Earliness</dt>
              <dd>
                {state.reward.earliness.toFixed(4)} <span>/ {REWARD_WEIGHTS.earliness.toFixed(2)}</span>
              </dd>
            </div>
            <div>
              <dt>Reward</dt>
              <dd>{state.reward.total.toFixed(4)}</dd>
            </div>
          </dl>
          <p className={controls.hint}>{rewardNote(state.config, REWARD_WEIGHTS)}</p>
        </div>
      </div>

      <UnderTheHood summary="Under the hood: world settings and export">
        <Settings key={JSON.stringify(config)} config={config} onApply={demo.configure} />
        <div className={styles.exportRow}>
          <button type="button" className={controls.button} onClick={exportJson}>
            <Download aria-hidden="true" />
            Export JSON trace
          </button>
          <p className={styles.notice} role="status">
            {notice}
          </p>
        </div>
      </UnderTheHood>
    </section>
  );
}
