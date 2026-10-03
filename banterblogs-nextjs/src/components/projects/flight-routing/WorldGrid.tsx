'use client';

import { useState, type KeyboardEvent } from 'react';
import { DEFAULT_CONFIG, formatTime, POLICY_LABELS, type Config } from '@/lib/projects/flight-routing/engine';
import type { Profile, ScenarioId } from '@/lib/projects/flight-routing/fixtures';
import { TIGHT_DEADLINE } from '@/lib/projects/flight-routing/experiment';
import { worldSeed, type PolicyWorlds, type World } from '@/lib/projects/flight-routing/worlds';
import { controls, Segmented, type Choice } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import type { Selection } from './useFlightDemo';
import styles from './demo.module.css';

// The hero: every policy over the same seeded worlds, one square a world, in
// the same place in every panel. Selecting a square replays that world below.

const COLUMNS = 8;
const OUTCOME_TEXT = { 'on-time': 'on time', late: 'late', failed: 'failed' } as const;
const REASON_TEXT: Record<string, string> = {
  cancelled: 'cancelled',
  no_candidates: 'stranded with no onward flight',
  unresolved_diversion: 'diverted',
  horizon: 'out of time',
  max_attempts: 'out of attempts',
};

const DEADLINES: Choice<number>[] = [
  { value: TIGHT_DEADLINE, label: formatTime(TIGHT_DEADLINE), note: 'tight' },
  { value: DEFAULT_CONFIG.deadline, label: formatTime(DEFAULT_CONFIG.deadline), note: 'slack' },
];
const PROFILES: Choice<Profile>[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'balanced', label: 'Mixed' },
  { value: 'storm', label: 'Stress' },
];
const ROUTES: Choice<ScenarioId>[] = [
  { value: 'west-east', label: 'SFO to JFK' },
  { value: 'east-west', label: 'JFK to SFO' },
];

function describe(world: World, index: number): string {
  const what = world.outcome === 'failed' ? REASON_TEXT[world.reason] ?? 'failed' : `${OUTCOME_TEXT[world.outcome]}, landed ${formatTime(world.arrival!)}`;
  return `World ${index + 1}, seed ${world.seed}: ${what}`;
}

interface WorldGridProps {
  config: Config;
  worlds: PolicyWorlds[];
  selection: Selection;
  onSelect: (selection: Selection) => void;
  /** returns why a configuration was refused, if it was */
  onConfigure: (config: Config) => string | null;
}

export function WorldGrid({ config, worlds, selection, onSelect, onConfigure }: WorldGridProps) {
  const [paired, setPaired] = useState<number | null>(null);
  const [error, setError] = useState('');
  const configure = (next: Config) => setError(onConfigure(next) ?? '');
  const count = worlds[0].worlds.length;

  // arrow keys move through a panel's 8x8 grid; Enter and Space select
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = Number((event.target as HTMLElement).dataset.index);
    if (Number.isNaN(from)) return;
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS };
    const to = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : from + (moves[event.key] ?? NaN);
    if (Number.isNaN(to) || to < 0 || to >= count) return;
    event.preventDefault();
    event.currentTarget.querySelector<HTMLElement>(`[data-index="${to}"]`)?.focus();
    setPaired(to);
  };

  return (
    <div className={styles.hero}>
      <div className={controls.row}>
        <Segmented legend="Deadline" name="deadline" options={DEADLINES} value={config.deadline} onChange={(deadline) => configure({ ...config, deadline })} />
        <Segmented legend="Disruptions" name="profile" options={PROFILES} value={config.profile} onChange={(profile) => configure({ ...config, profile })} />
        <Segmented legend="Route" name="route" options={ROUTES} value={config.scenario} onChange={(scenario) => configure({ ...config, scenario })} />
      </div>
      {error && (
        <p role="alert" className={controls.error}>
          {error}
        </p>
      )}

      <ProjectFigureTransition slug="flight-routing">
        <div className={styles.panels} onPointerLeave={() => setPaired(null)}>
          {worlds.map((row) => {
            const active = row.policy === selection.policy;
            return (
              <div key={row.policy} className={styles.panel} data-active={active || undefined}>
                <h3 className={styles.panelLabel}>{POLICY_LABELS[row.policy]}</h3>
                <p className={styles.panelScore}>
                  <strong>{row.onTime}</strong>
                  <span>/{count} on time</span>
                </p>
                <p className={styles.panelRest}>
                  {row.late} late · {row.failed} failed
                </p>
                <div
                  role="group"
                  aria-label={`${POLICY_LABELS[row.policy]}: ${row.onTime} of ${count} worlds on time. Select a world to replay it.`}
                  className={styles.grid}
                  onKeyDown={onKeyDown}
                >
                  {row.worlds.map((world, index) => {
                    const selected = active && index === selection.index;
                    const tabbable = active ? index === selection.index : index === 0;
                    return (
                      <button
                        key={world.seed}
                        type="button"
                        data-index={index}
                        data-outcome={world.outcome}
                        data-paired={paired === index || undefined}
                        aria-pressed={selected}
                        aria-label={describe(world, index)}
                        title={describe(world, index)}
                        tabIndex={tabbable ? 0 : -1}
                        className={styles.cell}
                        onPointerEnter={() => setPaired(index)}
                        onFocus={() => setPaired(index)}
                        onClick={() => onSelect({ policy: row.policy, index })}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ProjectFigureTransition>

      <div className={styles.legendRow}>
        <ul className={styles.legend} aria-label="Square key">
          <li data-outcome="on-time">On time</li>
          <li data-outcome="late">Late</li>
          <li data-outcome="failed">Never arrived</li>
        </ul>
        <p>
          Seeds {worldSeed(config, 0)}–{worldSeed(config, count - 1)}. A world sits in the same square in every panel, so a
          difference between panels is the policy&apos;s alone. Select one to replay it.
        </p>
      </div>
    </div>
  );
}
