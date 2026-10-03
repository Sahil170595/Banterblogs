'use client';

import { useState } from 'react';
import { initialConfig } from '@/lib/projects/code-verification/engine';
import { OPENING_SELECTION, SuiteMatrix, type MatrixSelection } from './SuiteMatrix';
import { Verifier } from './Verifier';
import styles from './verifier.module.css';

/**
 * The code verification page's live demo: every patch against every test,
 * under the smoke suite or the full one, then the selected patch's evidence
 * in the verifier, already run.
 */
export function CodeVerificationDemo() {
  const [selection, setSelection] = useState<MatrixSelection>(OPENING_SELECTION);
  const initial = { ...initialConfig(selection.taskId), candidateId: selection.candidateId, scope: selection.scope };
  return (
    <div className={styles.demo}>
      <SuiteMatrix selection={selection} onSelect={setSelection} />
      <Verifier key={JSON.stringify(selection)} initial={initial} />
    </div>
  );
}
