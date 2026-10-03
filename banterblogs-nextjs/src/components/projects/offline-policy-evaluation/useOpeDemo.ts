'use client';

import { useState } from 'react';
import { DEFAULT_CONFIG, evaluate, type Config, type Method } from '@/lib/projects/offline-policy-evaluation/engine';

// The demo's state: one applied evaluation and the estimator in view. The
// evaluation is deterministic from its configuration, so the server's render
// and the browser's agree without shipping the cohort as props.

export const DEFAULT_METHOD: Method = 'normalized';

export function useOpeDemo() {
  const [evaluation, setEvaluation] = useState(() => evaluate(DEFAULT_CONFIG));
  const [method, setMethod] = useState<Method>(DEFAULT_METHOD);

  return {
    config: evaluation.config,
    method,
    evaluation,
    setMethod,
    /** evaluate a configuration and show it; returns why it was refused, if it was */
    configure(next: Config): string | null {
      try {
        setEvaluation(evaluate(next));
        return null;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'This configuration could not be evaluated.';
        console.error('Offline evaluation rejected configuration:', message, next);
        return message;
      }
    },
    reset() {
      setEvaluation(evaluate(DEFAULT_CONFIG));
      setMethod(DEFAULT_METHOD);
    },
  };
}

export type OpeDemo = ReturnType<typeof useOpeDemo>;
