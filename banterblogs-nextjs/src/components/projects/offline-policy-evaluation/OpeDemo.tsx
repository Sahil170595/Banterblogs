'use client';

import { ControlCheck } from './ControlCheck';
import { EvaluatorLab } from './EvaluatorLab';
import { useOpeDemo } from './useOpeDemo';
import styles from './ope.module.css';

/**
 * The offline policy evaluation page's live demo: whether the target's gain
 * over the logger survives its controls, then the evaluation underneath.
 */
export function OpeDemo() {
  const demo = useOpeDemo();
  return (
    <div className={styles.demo}>
      <ControlCheck evaluation={demo.evaluation} method={demo.method} onMethod={demo.setMethod} onConfigure={demo.configure} />
      <EvaluatorLab demo={demo} />
    </div>
  );
}
