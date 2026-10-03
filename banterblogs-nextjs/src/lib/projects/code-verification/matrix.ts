import { CANDIDATES, evaluate, initialConfig, type TaskId } from './engine';

/** Every patch on one task, graded on the full suite and on the smoke suite. */
export function reportsFor(taskId: TaskId) {
  return CANDIDATES.map((candidate) => ({
    candidate,
    full: evaluate({ ...initialConfig(taskId), candidateId: candidate.id }),
    smoke: evaluate({ ...initialConfig(taskId), candidateId: candidate.id, scope: 'smoke' }),
  }));
}
