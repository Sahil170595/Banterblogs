'use client';

import { useMemo, useState } from 'react';
import { ZodError } from 'zod';
import { createSession, exportTrace, replayTrace, score, step } from '@/lib/projects/customer-service/engine';
import { measureControls, type ControlMeasurement } from '@/lib/projects/customer-service/measurements';
import type { Config, Session } from '@/lib/projects/customer-service/model';
import { scriptedActions, type Preset } from '@/lib/projects/customer-service/scripts';
import { describeRefusal } from '../refusal';

// The demo's state: the scored control trajectories on the board, the one
// loaded into the environment below, and whatever the visitor does to it.

/** the board opens on the trajectory that pays the right amount to the wrong record */
export const OPENING_CONTROL = 'duplicate:wrong-capture';
/** an imported trace larger than this is refused before parsing */
export const MAX_TRACE_BYTES = 2_000_000;

const play = (config: Config, preset: Preset): Session => scriptedActions(config, preset).reduce(step, createSession(config));

// a refused setting is named as the form labels it
const FIELD_LABELS: Record<string, string> = { scenario: 'Case', stock: 'Preferred-finish stock', totalCents: 'Order total (cents)' };
function refusal(cause: unknown): string {
  const labelled =
    cause instanceof ZodError
      ? new ZodError(cause.issues.map((issue) => ({ ...issue, path: issue.path.map((part) => (typeof part === 'string' ? (FIELD_LABELS[part] ?? part) : part)) })))
      : cause;
  return describeRefusal(labelled);
}

export type ImportResult = { ok: true; actions: number; reward: number } | { ok: false; message: string };

export function useServiceDemo() {
  const controls = useMemo(() => measureControls(), []);
  const opening = controls.find((c) => c.id === OPENING_CONTROL)!;
  const [selected, setSelected] = useState<string | null>(opening.id);
  const [session, setSession] = useState<Session>(() => play(opening.config, opening.preset));
  const [preset, setPreset] = useState<Preset>(opening.preset);
  const [scriptIndex, setScriptIndex] = useState<number | null>(null);
  const script = scriptedActions(session.config, preset);

  const replace = (next: Session) => {
    setSession(next);
    setScriptIndex(null);
  };

  return {
    controls,
    selected,
    session,
    preset,
    script,
    scriptIndex,
    /** load a scored control into the environment, played to its end */
    select(control: ControlMeasurement) {
      setSelected(control.id);
      setPreset(control.preset);
      replace(play(control.config, control.preset));
    },
    /** one visitor action against the current world */
    act(input: unknown) {
      setSelected(null);
      replace(step(session, input));
    },
    /** a fresh episode; returns why the configuration was refused, if it was */
    restart(config: unknown): string | null {
      try {
        setSelected(null);
        replace(createSession(config));
        return null;
      } catch (cause) {
        const message = refusal(cause);
        // a refused input is handled and shown; a warning, not an application error
        console.warn('Service environment configuration rejected:', message, config);
        return message;
      }
    },
    choosePreset(next: Preset) {
      setPreset(next);
      setScriptIndex(null);
    },
    /** run the chosen script's next action, or all of them, from a fresh episode */
    advanceScript(all: boolean) {
      let next = scriptIndex === null ? createSession(session.config) : session;
      let index = scriptIndex ?? 0;
      do next = step(next, script[index++]);
      while (all && index < script.length && next.termination === 'open');
      setSelected(null);
      setSession(next);
      setScriptIndex(index);
    },
    exportJson: () => JSON.stringify(exportTrace(session), null, 2),
    /** replay an exported trace: what it replayed, or why it was refused */
    async importTrace(file: File): Promise<ImportResult> {
      try {
        if (file.size > MAX_TRACE_BYTES) throw new Error('The trace is larger than the 2 MB import limit.');
        const replayed = replayTrace(JSON.parse(await file.text()));
        setSelected(null);
        replace(replayed);
        return { ok: true, actions: replayed.events.length, reward: score(replayed).total };
      } catch (cause) {
        const message = refusal(cause);
        console.warn('Service environment trace import rejected:', message);
        return { ok: false, message };
      }
    },
  };
}

export type ServiceDemo = ReturnType<typeof useServiceDemo>;
