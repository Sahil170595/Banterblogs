'use client';

import { ConvergenceTable } from './ConvergenceTable';
import { WhiteboardEditor } from './WhiteboardEditor';
import styles from './whiteboard.module.css';

/**
 * The whiteboard page's live demo: what two people editing at once does to
 * sceneledger's clients, then the editor itself, local to this tab.
 */
export function WhiteboardDemo() {
  return (
    <div className={styles.page}>
      <ConvergenceTable />
      <WhiteboardEditor />
    </div>
  );
}
