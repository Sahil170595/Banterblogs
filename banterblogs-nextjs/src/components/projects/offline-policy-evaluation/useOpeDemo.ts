'use client';

import { useState } from 'react';
import { ZodError } from 'zod';
import { configSchema, DEFAULT_CONFIG, evaluate, type Config, type Method } from '@/lib/projects/offline-policy-evaluation/engine';
import { describeRefusal } from '../refusal';
import { FIELD_LABELS } from './copy';

// The demo's state: one applied evaluation, the estimator in view and the
// trajectory the ledger shows. The evaluation is deterministic from its
// configuration, so the server's render and the browser's agree without
// shipping the cohort as props.

export const DEFAULT_METHOD: Method = 'normalized';

/** why a configuration cannot be evaluated, naming each field as the form does */
function refusal(next: Config): string | null {
  const result = configSchema.safeParse(next);
  if (result.success) return null;
  const label = (part: string | number) => (typeof part === 'string' ? (FIELD_LABELS[part as keyof Config] ?? part) : part);
  return describeRefusal(new ZodError(result.error.issues.map((issue) => ({ ...issue, path: issue.path.map(label) }))));
}

export function useOpeDemo() {
  const [evaluation, setEvaluation] = useState(() => evaluate(DEFAULT_CONFIG));
  const [method, setMethod] = useState<Method>(DEFAULT_METHOD);
  // the ledger's trajectory, from 0
  const [trajectory, setTrajectory] = useState(0);

  return {
    config: evaluation.config,
    method,
    evaluation,
    trajectory,
    setMethod,
    setTrajectory,
    /** evaluate a configuration and show it; returns why it was refused, if it was */
    configure(next: Config): string | null {
      const refused = refusal(next);
      if (refused) {
        console.warn('Offline evaluation rejected configuration:', refused, next);
        return refused;
      }
      try {
        setEvaluation(evaluate(next));
        // a smaller cohort moves the ledger to its last trajectory, and it stays there
        setTrajectory((current) => Math.min(current, next.size - 1));
        return null;
      } catch (cause) {
        // the engine's own refusals (an overflowing weight) already read as sentences
        const message = describeRefusal(cause);
        console.warn('Offline evaluation rejected configuration:', message, next);
        return message;
      }
    },
    reset() {
      setEvaluation(evaluate(DEFAULT_CONFIG));
      setMethod(DEFAULT_METHOD);
      setTrajectory(0);
    },
  };
}

export type OpeDemo = ReturnType<typeof useOpeDemo>;
