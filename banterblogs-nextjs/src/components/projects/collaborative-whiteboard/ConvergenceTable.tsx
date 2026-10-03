'use client';

import { useMemo, useState } from 'react';
import type { ApplyMode, Client, Outcome, Schedule } from '@/lib/projects/collaborative-whiteboard/protocol';
import { BLUE, concurrentOutcomes, NOTE, ROSE, undoCreation, undoOverNewer, WHITE } from '@/lib/projects/collaborative-whiteboard/scenarios';
import { controls, Segmented } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import styles from './whiteboard.module.css';

// The hero: two people recolour one note at once, A to rose and B to blue.
// The server persists and numbers the two edits in one order and broadcasts
// each outside its lock, so each client can receive them in either order.
// Every combination, and what each client ends up showing. On a phone each
// row stacks into a card (controls.stackTable), so the outcome columns are
// never scrolled out of sight.

const NAMES: Record<string, string> = { [WHITE]: 'white', [ROSE]: 'rose', [BLUE]: 'blue' };
const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const say = (n: number) => words[n] ?? String(n);
const COLUMNS = ['Stored first', 'A receives', 'B receives', 'Database', 'A shows', 'B shows'] as const;
const MODE_WORDS: Record<ApplyMode, string> = { arrival: 'as they arrive', sequence: 'in sequence order' };

function Chip({ fill, diverged }: { fill: string; diverged?: boolean }) {
  return (
    <span className={styles.chip} data-diverged={diverged || undefined}>
      <i style={{ backgroundColor: fill }} aria-hidden="true" />
      {NAMES[fill] ?? fill}
      {diverged && ', not the database'}
    </span>
  );
}

const arrival = (schedule: Schedule, client: Client) => schedule.arrival[client].map((seq) => `${seq}`).join(' then ');

export function ConvergenceTable() {
  const [mode, setMode] = useState<ApplyMode>('arrival');
  const rows = useMemo(() => concurrentOutcomes(mode), [mode]);
  const asArrived = useMemo(() => concurrentOutcomes('arrival'), []);
  const bySeq = useMemo(() => concurrentOutcomes('sequence'), []);
  const split = asArrived.filter((r) => r.outcome.diverged.length > 0).length;
  const splitBySeq = bySeq.filter((r) => r.outcome.diverged.length > 0).length;
  const splitNow = mode === 'arrival' ? split : splitBySeq;
  const over = undoOverNewer();
  const created = undoCreation();
  const fillOf = (o: Outcome, who: 'database' | Client) => (who === 'database' ? o.database : o.scenes[who])[0]?.fill ?? '';
  const cell = (column: (typeof COLUMNS)[number]) => ({ role: 'cell', 'data-label': column });

  return (
    <div className={styles.hero}>
      <p className={styles.headline}>
        Two people recolour the same note at once. The server stores both edits one at a time, numbers them in the order it stored them, and sends
        each one back to both screens as an echo. It sends each echo after releasing its lock on the board, so the two sends can overtake each
        other and each screen can receive the echoes in either order: {say(rows.length)} possible orderings in all.
      </p>
      <Segmented
        legend="Each client applies the server’s echoes"
        name="convergence-mode"
        value={mode}
        options={[
          { value: 'arrival', label: 'As they arrive', note: 'what Sceneledger does now' },
          { value: 'sequence', label: 'In sequence order', note: 'the fix shown here' },
        ]}
        onChange={setMode}
      />
      <p className={controls.lead}>
        Each row is one possible ordering, counted once. <strong>Stored first</strong> is whose edit the server saved first, so the database, the
        saved copy, ends with the other. <strong>A receives</strong> and <strong>B receives</strong> give the order the two echoes, seq 1 and seq 2
        by their sequence numbers, reached each screen. <strong>Red</strong> marks a screen showing a colour the database does not have:{' '}
        {splitNow} of the {rows.length} orderings with the echoes applied {MODE_WORDS[mode]}.
      </p>
      <ProjectFigureTransition slug="collaborative-whiteboard">
        <div className={styles.tableScroll} role="region" aria-label="Every order two concurrent edits can take" tabIndex={0}>
          <table className={`${styles.schedules} ${controls.stackTable}`} role="table">
            <thead role="rowgroup">
              <tr role="row">
                {COLUMNS.map((column) => (
                  <th key={column} scope="col" role="columnheader">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {rows.map(({ schedule, outcome }, i) => (
                <tr key={i} role="row" data-split={outcome.diverged.length > 0 || undefined}>
                  <th scope="row" role="rowheader" data-label="Stored first" className={styles.order}>
                    {schedule.serverOrder[0] === 'A' ? 'A’s rose' : 'B’s blue'}
                  </th>
                  {/* one span per value, so a stacked card sets it against its label */}
                  <td {...cell('A receives')} className={styles.order}>
                    <span>
                      <span className={styles.seq}>seq</span> {arrival(schedule, 'A')}
                    </span>
                  </td>
                  <td {...cell('B receives')} className={styles.order}>
                    <span>
                      <span className={styles.seq}>seq</span> {arrival(schedule, 'B')}
                    </span>
                  </td>
                  <td {...cell('Database')}>
                    <Chip fill={fillOf(outcome, 'database')} />
                  </td>
                  <td {...cell('A shows')}>
                    <Chip fill={fillOf(outcome, 'A')} diverged={outcome.diverged.includes('A')} />
                  </td>
                  <td {...cell('B shows')}>
                    <Chip fill={fillOf(outcome, 'B')} diverged={outcome.diverged.includes('B')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ProjectFigureTransition>
      <p className={styles.caption}>
        Applying the echoes in sequence order fixes these eight, but not everything a shared board needs: in the two undo cases below, someone still
        loses an edit even when every message arrives in order.
      </p>
      <div className={styles.undoCases}>
        <section className={styles.undoCase} aria-label="Undo over a newer edit">
          <h3>Undo over a newer edit</h3>
          <ol>
            <li>A recolours the {NAMES[NOTE.fill]} note rose.</li>
            <li>B recolours it blue.</li>
            <li>A presses undo.</li>
          </ol>
          <p>The note goes back to {NAMES[over.database[0].fill]}: A&apos;s undo restores the colour it replaced, and B&apos;s blue is gone.</p>
        </section>
        <section className={styles.undoCase} aria-label="Undo of a shape someone moved">
          <h3>Undo of a shape someone moved</h3>
          <ol>
            <li>A adds the note.</li>
            <li>B moves it across the board.</li>
            <li>A presses undo.</li>
          </ol>
          <p>{created.database.length === 0 ? 'The note is deleted, and B’s move with it.' : 'The note survives.'}</p>
        </section>
      </div>
    </div>
  );
}
