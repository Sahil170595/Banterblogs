'use client';

import { Check, X } from 'lucide-react';
import { TASKS, type CandidateId, type Report, type RunConfig, type TaskId } from '@/lib/projects/code-verification/engine';
import { reportsFor } from '@/lib/projects/code-verification/matrix';
import { controls, Segmented, type Choice } from '../controls';
import { ProjectFigureTransition } from '../ProjectTransitions';
import { GROUP_GLOSSES, GROUP_NAMES, TRANSITION_ARROWS, TRANSITION_NAMES, TRANSITION_ORDER } from './vocabulary';
import styles from './verifier.module.css';

// The hero: every candidate patch against every test of a task, each cell the
// test's transition from the buggy baseline to the patched function. The
// smoke suite keeps only one fail-to-pass and one pass-to-pass test; the two
// verdict columns say what each suite concludes, side by side, so the
// contrast needs no click.

// short enough that both fit one row on a phone; the full titles head the matrix
const TASK_LABELS: Record<TaskId, string> = { intervals: 'Interval union', unique: 'Deduplication' };
const TASK_CHOICES: Choice<TaskId>[] = TASKS.map((t) => ({ value: t.id, label: TASK_LABELS[t.id] }));
const SCOPE_CHOICES: Choice<RunConfig['scope']>[] = [
  { value: 'smoke', label: 'Smoke', note: '2 tests' },
  { value: 'full', label: 'Full', note: '6 tests' },
];
const NOT_IN_SMOKE = 'not in smoke suite';
const VERDICT_COLUMNS: { scope: RunConfig['scope']; label: string }[] = [
  { scope: 'smoke', label: 'Smoke verdict' },
  { scope: 'full', label: 'Full verdict' },
];

export interface MatrixSelection {
  taskId: TaskId;
  scope: RunConfig['scope'];
  candidateId: CandidateId;
}

export function SuiteMatrix({ selection, onSelect }: { selection: MatrixSelection; onSelect: (next: MatrixSelection, inspect?: boolean) => void }) {
  const task = TASKS.find((t) => t.id === selection.taskId)!;
  const rows = reportsFor(task.id);
  const smokeIds = new Set(rows[0].smoke.rows.map((r) => r.id));
  const passing = (scope: RunConfig['scope']) => rows.filter((r) => r[scope].resolved).length;
  const verdictOf = (report: Report) => (report.resolved ? 'Passes' : 'Fails');
  const skipped = (id: string) => selection.scope === 'smoke' && !smokeIds.has(id);

  return (
    <div className={styles.hero}>
      <div className={controls.row}>
        <Segmented
          legend="Task"
          name="task"
          options={TASK_CHOICES}
          value={selection.taskId}
          onChange={(taskId) => onSelect({ ...selection, taskId })}
        />
        <Segmented
          legend="Suite"
          name="scope"
          options={SCOPE_CHOICES}
          value={selection.scope}
          onChange={(scope) => onSelect({ ...selection, scope })}
        />
      </div>
      <p className={styles.headline}>
        On the two-test smoke suite, {passing('smoke')} of {rows.length} patches pass. On the full suite, {passing('full')}{' '}
        {passing('full') === 1 ? 'does' : 'do'}.
      </p>
      <p className={controls.lead}>
        <strong>The task:</strong> {task.requirement} <strong>The bug:</strong> {task.fault}
      </p>
      <p className={controls.lead}>
        Each row is a candidate patch; each column a test, run twice, on the buggy function and on the patched one. A{' '}
        {GROUP_NAMES.repair.toLowerCase()} test is one the bug fails and the fix must pass; a {GROUP_NAMES.preserve.toLowerCase()} test{' '}
        {GROUP_GLOSSES.preserve}. The smoke suite is a quick check that runs one test of each kind; the full suite runs all six. Compare the two
        verdict columns: the smoke suite passes patches the full suite fails. Select a patch to inspect its evidence below, and switch the suite to
        see which tests each one runs.
      </p>
      <ul className={styles.key} aria-label="Cell key">
        {TRANSITION_ORDER.map((t) => (
          <li key={t} data-transition={t}>
            {TRANSITION_NAMES[t]} <span>{TRANSITION_ARROWS[t]}</span>
          </li>
        ))}
      </ul>

      <ProjectFigureTransition slug="code-verification">
        <div className={styles.matrixScroll} role="region" aria-label={`${task.title}: patches against tests`} tabIndex={0}>
          <table className={`${styles.matrix} ${controls.stackTable}`} data-scope={selection.scope} role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">
                  Patch
                </th>
                {VERDICT_COLUMNS.map((column) => (
                  <th key={column.scope} scope="col" role="columnheader" className={styles.verdictHead}>
                    {column.label}
                  </th>
                ))}
                {rows[0].full.rows.map((test) => (
                  <th
                    key={test.id}
                    scope="col"
                    role="columnheader"
                    data-smoke={smokeIds.has(test.id) || undefined}
                    data-skipped={skipped(test.id) || undefined}
                    data-group={test.group}
                  >
                    <span>{GROUP_NAMES[test.group]}</span>
                    {test.label}
                    {skipped(test.id) && <small>{NOT_IN_SMOKE}</small>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {rows.map(({ candidate, full, smoke }) => {
                const reports = { smoke, full };
                const selected = candidate.id === selection.candidateId;
                return (
                  <tr key={candidate.id} role="row" data-selected={selected || undefined}>
                    <th scope="row" role="rowheader">
                      <button type="button" aria-pressed={selected} onClick={() => onSelect({ ...selection, candidateId: candidate.id }, true)}>
                        {candidate.label}
                      </button>
                    </th>
                    {VERDICT_COLUMNS.map((column) => (
                      <td
                        key={column.scope}
                        role="cell"
                        data-label={column.label}
                        className={styles.verdictCell}
                        data-resolved={reports[column.scope].resolved || undefined}
                      >
                        {/* a shape as well as a colour: Passes and Fails must not rest on hue */}
                        {reports[column.scope].resolved ? (
                          <Check aria-hidden="true" data-verdict="passes" className={styles.verdictIcon} />
                        ) : (
                          <X aria-hidden="true" data-verdict="fails" className={styles.verdictIcon} />
                        )}
                        {verdictOf(reports[column.scope])}
                      </td>
                    ))}
                    {full.rows.map((test) => (
                      <td
                        key={test.id}
                        role="cell"
                        data-label={`${GROUP_NAMES[test.group]}: ${test.label}${skipped(test.id) ? ` (${NOT_IN_SMOKE})` : ''}`}
                        data-smoke={smokeIds.has(test.id) || undefined}
                        data-skipped={skipped(test.id) || undefined}
                      >
                        <span className={styles.mark}>
                          <span
                            className={styles.cell}
                            data-transition={test.transition}
                            role="img"
                            aria-label={`${test.label}: ${TRANSITION_NAMES[test.transition].toLowerCase()}`}
                          />
                          <span className={styles.cellText} aria-hidden="true">
                            {TRANSITION_NAMES[test.transition]}
                          </span>
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ProjectFigureTransition>
      {selection.scope === 'smoke' && (
        <p className={styles.caption}>
          Hatched columns are the tests the smoke suite skips: they show what a full run would find, and the smoke verdict ignores them.
        </p>
      )}
    </div>
  );
}

/** the page opens where the smoke suite misleads: an example-only patch it passes */
export const OPENING_SELECTION: MatrixSelection = { taskId: 'intervals', scope: 'smoke', candidateId: 'overfit' };
