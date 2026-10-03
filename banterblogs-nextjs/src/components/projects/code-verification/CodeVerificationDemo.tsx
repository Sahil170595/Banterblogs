'use client';

import { useRef, useState } from 'react';
import { revealResult } from '../reveal';
import { OPENING_SELECTION, SuiteMatrix, type MatrixSelection } from './SuiteMatrix';
import { Verifier } from './Verifier';
import styles from './verifier.module.css';

/**
 * The code verification page's live demo: every patch against every test,
 * under the smoke suite or the full one, then the selected patch's evidence
 * in the verifier, already run. The two share one selection, whichever side
 * changes it.
 */
export function CodeVerificationDemo() {
  const [selection, setSelection] = useState<MatrixSelection>(OPENING_SELECTION);
  const results = useRef<HTMLDivElement>(null);
  return (
    <div className={styles.demo}>
      <SuiteMatrix
        selection={selection}
        onSelect={(next, inspect) => {
          setSelection(next);
          // a picked patch's verdict and evidence open below the matrix, off screen on a phone
          if (inspect) requestAnimationFrame(() => revealResult(results.current));
        }}
      />
      <Verifier selection={selection} onSelectionChange={setSelection} resultsRef={results} />
    </div>
  );
}
