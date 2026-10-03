'use client';

import { TASKS, type CandidateId, type Report, type RunConfig, type TaskId, type Transition } from '@/lib/projects/code-verification/engine';
import { reportsFor } from '@/lib/projects/code-verification/matrix';
import { controls, Segmented, type Choice } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import styles from './verifier.module.css';

// The hero: every candidate patch against every test of a task, each cell the
// test's transition from the buggy baseline to the patched function. The
// smoke suite keeps only one repair and one preservation test; the verdict
// column says what that suite would have concluded.

const TRANSITION_TEXT: Record<Transition, string> = {
  'fail-pass': 'repaired',
  'pass-pass': 'still passes',
  'fail-fail': 'still broken',
  'pass-fail': 'regressed',
};
const TASK_CHOICES: Choice<TaskId>[] = TASKS.map((t) => ({ value: t.id, label: t.title }));
const SCOPE_CHOICES: Choice<RunConfig['scope']>[] = [
  { value: 'smoke', label: 'Smoke', note: '2 tests' },
  { value: 'full', label: 'Full', note: '6 tests' },
];

export interface MatrixSelection {
  taskId: TaskId;
  scope: RunConfig['scope'];
  candidateId: CandidateId;
}

export function SuiteMatrix({ selection, onSelect }: { selection: MatrixSelection; onSelect: (next: MatrixSelection) => void }) {
  const task = TASKS.find((t) => t.id === selection.taskId)!;
  const rows = reportsFor(task.id);
  const smokeIds = new Set(rows[0].smoke.rows.map((r) => r.id));
  const passing = (scope: RunConfig['scope']) => rows.filter((r) => r[scope].resolved).length;
  const verdictOf = (report: Report) => (report.resolved ? 'Passes' : 'Fails');

  return (
    <div className={styles.hero}>
      <div className={controls.row}>
        <Segmented legend="Task" name="task" options={TASK_CHOICES} value={selection.taskId} onChange={(taskId) => onSelect({ ...selection, taskId })} />
        <Segmented legend="Suite" name="scope" options={SCOPE_CHOICES} value={selection.scope} onChange={(scope) => onSelect({ ...selection, scope })} />
      </div>
      <p className={styles.headline}>
        On the two-test smoke suite, {passing('smoke')} of {rows.length} patches pass. On the full suite, {passing('full')}{' '}
        {passing('full') === 1 ? 'does' : 'do'}.
      </p>

      <ProjectFigureTransition slug="code-verification">
        <div className={styles.matrixScroll} role="region" aria-label={`${task.title}: patches against tests`} tabIndex={0}>
          <table className={styles.matrix} data-scope={selection.scope}>
            <thead>
              <tr>
                <th scope="col">Patch</th>
                {rows[0].full.rows.map((test) => (
                  <th key={test.id} scope="col" data-smoke={smokeIds.has(test.id) || undefined} data-group={test.group}>
                    <span>{test.group === 'repair' ? 'Repair' : 'Keep'}</span>
                    {test.label}
                  </th>
                ))}
                <th scope="col">{selection.scope === 'smoke' ? 'Smoke verdict' : 'Verdict'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ candidate, full, smoke }) => {
                const report = selection.scope === 'smoke' ? smoke : full;
                const selected = candidate.id === selection.candidateId;
                return (
                  <tr key={candidate.id} data-selected={selected || undefined}>
                    <th scope="row">
                      <button type="button" aria-pressed={selected} onClick={() => onSelect({ ...selection, candidateId: candidate.id })}>
                        {candidate.label}
                      </button>
                    </th>
                    {full.rows.map((test) => (
                      <td key={test.id} data-smoke={smokeIds.has(test.id) || undefined}>
                        <span className={styles.cell} data-transition={test.transition} role="img" aria-label={`${test.label}: ${TRANSITION_TEXT[test.transition]}`} />
                      </td>
                    ))}
                    <td className={styles.verdictCell} data-resolved={report.resolved || undefined}>
                      {verdictOf(report)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ProjectFigureTransition>
      <ul className={styles.key} aria-label="Cell key">
        <li data-transition="fail-pass">Repaired</li>
        <li data-transition="pass-pass">Still passes</li>
        <li data-transition="fail-fail">Still broken</li>
        <li data-transition="pass-fail">Regressed</li>
      </ul>
      <p className={styles.caption}>
        Each cell runs the test on the buggy function and on the patched one. {selection.scope === 'smoke' ? 'Faded columns are the tests the smoke suite skips. ' : ''}
        Select a patch to inspect its evidence below.
      </p>
    </div>
  );
}

/** the page opens where the smoke suite misleads: an example-only patch it passes */
export const OPENING_SELECTION: MatrixSelection = { taskId: 'intervals', scope: 'smoke', candidateId: 'overfit' };
