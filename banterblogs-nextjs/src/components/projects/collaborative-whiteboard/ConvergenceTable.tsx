'use client';

import { useMemo, useState } from 'react';
import type { ApplyMode, Client, Outcome, Schedule } from '@/lib/projects/collaborative-whiteboard/protocol';
import { BLUE, concurrentOutcomes, ROSE, undoCreation, undoOverNewer, WHITE } from '@/lib/projects/collaborative-whiteboard/scenarios';
import { Segmented } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import styles from './whiteboard.module.css';

// The hero: two people recolour one note at once, A to rose and B to blue.
// The server persists and numbers the two edits in one order and broadcasts
// each outside its lock, so each client can receive them in either order.
// Every combination, and what each client ends up showing.

const NAMES: Record<string, string> = { [WHITE]: 'white', [ROSE]: 'rose', [BLUE]: 'blue' };
const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const say = (n: number) => words[n] ?? String(n);

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
  const over = undoOverNewer();
  const created = undoCreation();
  const fillOf = (o: Outcome, who: 'database' | Client) => (who === 'database' ? o.database : o.scenes[who])[0]?.fill ?? '';

  return (
    <div className={styles.hero}>
      <p className={styles.headline}>
        Two people recolour the same note at once. Of the {say(rows.length)} ways their edits can be stored and delivered,{' '}
        {say(split)} leave someone looking at a colour the database does not have, because each client applies the server&apos;s echoes
        as they arrive. Applied in sequence order, {splitBySeq === 0 ? 'all eight agree' : `${say(splitBySeq)} still disagree`}.
      </p>
      <Segmented
        legend="Each client applies the echoes"
        name="convergence-mode"
        value={mode}
        options={[
          { value: 'arrival', label: 'As they arrive', note: 'sceneledger' },
          { value: 'sequence', label: 'In sequence order' },
        ]}
        onChange={setMode}
      />
      <ProjectFigureTransition slug="collaborative-whiteboard">
        <div className={styles.tableScroll} role="region" aria-label="Every order two concurrent edits can take" tabIndex={0}>
          <table className={styles.schedules}>
            <thead>
              <tr>
                <th scope="col">Stored first</th>
                <th scope="col">A receives</th>
                <th scope="col">B receives</th>
                <th scope="col">Database</th>
                <th scope="col">A shows</th>
                <th scope="col">B shows</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ schedule, outcome }, i) => (
                <tr key={i} data-split={outcome.diverged.length > 0 || undefined}>
                  <td className={styles.order}>{schedule.serverOrder[0] === 'A' ? 'A’s rose' : 'B’s blue'}</td>
                  <td className={styles.order}>
                    <span>seq</span> {arrival(schedule, 'A')}
                  </td>
                  <td className={styles.order}>
                    <span>seq</span> {arrival(schedule, 'B')}
                  </td>
                  <td>
                    <Chip fill={fillOf(outcome, 'database')} />
                  </td>
                  <td>
                    <Chip fill={fillOf(outcome, 'A')} diverged={outcome.diverged.includes('A')} />
                  </td>
                  <td>
                    <Chip fill={fillOf(outcome, 'B')} diverged={outcome.diverged.includes('B')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ProjectFigureTransition>
      <p className={styles.caption}>
        Sequence numbers count the edits in the order the server stored them. Ordering fixes these eight; it is not all a shared board
        needs, and the two cases below go wrong even when every message arrives in order.
      </p>
      <div className={styles.undoCases}>
        <section className={styles.undoCase} aria-label="Undo over a newer edit">
          <h3>Undo over a newer edit</h3>
          <ol>
            <li>A recolours the note rose.</li>
            <li>B recolours it blue.</li>
            <li>A presses undo.</li>
          </ol>
          <p>
            The note goes back to {NAMES[over.database[0].fill]}: A&apos;s undo restores the colour it replaced, and B&apos;s blue is gone.
          </p>
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
