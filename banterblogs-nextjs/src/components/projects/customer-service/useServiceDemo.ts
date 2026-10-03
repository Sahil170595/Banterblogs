'use client';

import { useMemo, useState } from 'react';
import { createSession, exportTrace, replayTrace, step } from '@/lib/projects/customer-service/engine';
import { measureControls, type ControlMeasurement } from '@/lib/projects/customer-service/measurements';
import type { Config, Session } from '@/lib/projects/customer-service/model';
import { scriptedActions, type Preset } from '@/lib/projects/customer-service/scripts';

// The demo's state: the scored control trajectories on the board, the one
// loaded into the environment below, and whatever the visitor does to it.

/** the board opens on the trajectory that pays the right amount to the wrong record */
export const OPENING_CONTROL = 'duplicate:wrong-capture';
/** an imported trace larger than this is refused before parsing */
export const MAX_TRACE_BYTES = 2_000_000;

const play = (config: Config, preset: Preset): Session => scriptedActions(config, preset).reduce(step, createSession(config));

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
        const message = cause instanceof Error ? cause.message : 'Invalid episode configuration.';
        console.error('Service environment configuration rejected:', message, config);
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
    /** replay an exported trace; returns why it was refused, if it was */
    async importTrace(file: File): Promise<string | null> {
      try {
        if (file.size > MAX_TRACE_BYTES) throw new Error('Trace exceeds the 2 MB import limit.');
        setSelected(null);
        replace(replayTrace(JSON.parse(await file.text())));
        return null;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Trace import failed.';
        console.error('Service environment trace import rejected:', message);
        return message;
      }
    },
  };
}

export type ServiceDemo = ReturnType<typeof useServiceDemo>;
